import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./logger";

export async function processStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const stripeSync = await getStripeSync();
  const event = await stripeSync.processWebhook(rawBody, signature);

  if (!event) return;

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
      subscription = await stripe.subscriptions.retrieve(subId);
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
      updates.plan = "pro";
    } else if (
      subscription.status === "canceled" ||
      subscription.status === "incomplete_expired" ||
      subscription.status === "unpaid"
    ) {
      updates.plan = "free";
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
  await db
    .update(companiesTable)
    .set({ subscriptionStatus: "active", plan: "pro" })
    .where(eq(companiesTable.id, companyId));
  logger.info({ companyId }, "invoice.payment_succeeded — subscription set to active");
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
