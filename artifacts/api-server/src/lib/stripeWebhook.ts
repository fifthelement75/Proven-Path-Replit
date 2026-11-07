import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./logger";
import { getTrustedSubscriptionSelection } from "../routes/stripeHelpers";

export async function processStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const stripeSync = await getStripeSync();
  // StripeSync verifies the raw payload and syncs its own Stripe tables, but
  // processWebhook returns void. Parse the event only after verification so
  // application billing entitlements can consume the same verified payload.
  await stripeSync.processWebhook(rawBody, signature);
  const event = JSON.parse(rawBody.toString("utf8"));

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncCompanyFromEvent(event);
    } else if (event.type === "invoice.payment_succeeded") {
      await handleInvoicePaymentSucceeded(event);
    } else if (event.type === "invoice.payment_failed") {
      await handleInvoicePaymentFailed(event);
    } else if (event.type === "customer.subscription.trial_will_end") {
      await handleTrialWillEnd(event);
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Failed to handle stripe webhook event");
    throw err;
  }
}

async function syncCompanyFromEvent(event: any): Promise<void> {
  const stripe = await getUncachableStripeClient();
  let companyId: number | null = null;
  let customerId: string | null = null;
  let subscription: any = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    companyId = session.metadata?.companyId ? Number(session.metadata.companyId) : null;
    customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    if (session.subscription) {
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      subscription = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price.product"] });
    }
  } else {
    subscription = event.data.object;
    customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
    companyId = subscription.metadata?.companyId ? Number(subscription.metadata.companyId) : null;
  }

  if (!companyId && customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !(customer as any).deleted) {
      const meta = (customer as any).metadata ?? {};
      if (meta.companyId) companyId = Number(meta.companyId);
    }
  }

  if (!companyId) {
    logger.warn({ eventType: event.type }, "Stripe event missing companyId metadata, skipping sync");
    return;
  }

  const updates: Record<string, any> = {};
  if (customerId) updates.stripeCustomerId = customerId;

  if (subscription) {
    updates.stripeSubscriptionId = subscription.id;
    updates.subscriptionStatus = subscription.status;
    if (subscription.status === "active" || subscription.status === "trialing") {
      const selection = await getTrustedSubscriptionSelection(subscription);
      // Metadata identifies the company, but Stripe's actual price/product is
      // the source of truth for access level and paid seat quantity.
      if (selection) {
        updates.plan = selection.plan;
        updates.stripeSeatQuantity = selection.quantity;
      } else {
        updates.plan = "free";
        updates.stripeSeatQuantity = null;
        logger.warn({ companyId, subscriptionId: subscription.id }, "Active Stripe subscription has no recognized paid plan");
      }
    } else if (
      subscription.status === "canceled" ||
      subscription.status === "incomplete_expired" ||
      subscription.status === "unpaid"
    ) {
      updates.plan = "free";
      updates.stripeSeatQuantity = null;
    }
  }

  await db.update(companiesTable).set(updates).where(eq(companiesTable.id, companyId));
  logger.info({ companyId, updates }, "Synced company from Stripe event");
}

async function getCompanyByCustomerId(customerId: string): Promise<number | null> {
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.stripeCustomerId, customerId))
    .limit(1);
  return company?.id ?? null;
}

async function handleInvoicePaymentSucceeded(event: any): Promise<void> {
  const invoice = event.data.object;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const companyId = await getCompanyByCustomerId(customerId);
  if (!companyId) return;
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) {
    logger.warn({ companyId, invoiceId: invoice.id }, "Paid invoice has no subscription");
    return;
  }
  const stripe = await getUncachableStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price.product"] });
  const selection = await getTrustedSubscriptionSelection(subscription);
  if (!selection) {
    await db
      .update(companiesTable)
      .set({ subscriptionStatus: subscription.status ?? "active", plan: "free", stripeSeatQuantity: null })
      .where(eq(companiesTable.id, companyId));
    logger.warn({ companyId, subscriptionId }, "Paid invoice subscription has no recognized paid plan");
    return;
  }
  await db
    .update(companiesTable)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: "active",
      plan: selection.plan,
      stripeSeatQuantity: selection.quantity,
    })
    .where(eq(companiesTable.id, companyId));
  logger.info({ companyId, plan: selection.plan, quantity: selection.quantity }, "invoice.payment_succeeded — subscription set to active");
}

async function handleInvoicePaymentFailed(event: any): Promise<void> {
  const invoice = event.data.object;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const companyId = await getCompanyByCustomerId(customerId);
  if (!companyId) return;
  await db
    .update(companiesTable)
    .set({ subscriptionStatus: "past_due" })
    .where(eq(companiesTable.id, companyId));
  logger.info({ companyId }, "invoice.payment_failed — subscription set to past_due");
}

async function handleTrialWillEnd(event: any): Promise<void> {
  const subscription = event.data.object;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;
  const companyId = await getCompanyByCustomerId(customerId);
  if (!companyId) return;
  logger.info({ companyId }, "customer.subscription.trial_will_end — trial ending soon");
}
