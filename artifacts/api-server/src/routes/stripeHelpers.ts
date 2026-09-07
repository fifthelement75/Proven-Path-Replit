import { getUncachableStripeClient } from "../lib/stripeClient";

export type BillingPlan = "professional" | "team";
export type CheckoutSelection = { plan: BillingPlan; quantity: number };
export type TrustedSubscriptionSelection = CheckoutSelection;

export function validateCheckoutSelection(input: unknown): { data?: CheckoutSelection; error?: string } {
  if (!input || typeof input !== "object") return { error: "Invalid checkout selection" };
  const { plan, quantity } = input as Record<string, unknown>;
  if (plan !== "professional" && plan !== "team") return { error: "Plan must be professional or team." };
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantity must be a positive integer." };
  }
  if (plan === "professional" && quantity !== 1) return { error: "Professional subscriptions require a quantity of 1." };
  if (plan === "team" && quantity < 10) return { error: "Team subscriptions require at least 10 seats." };
  return { data: { plan, quantity } };
}

export const BILLING_PLANS: Record<BillingPlan, {
  productName: string;
  unitAmount: number;
  minimumQuantity: number;
}> = {
  professional: {
    productName: "Professional - For individual contributors",
    unitAmount: 999,
    minimumQuantity: 1,
  },
  team: {
    productName: "Team - For growing HR teams",
    unitAmount: 2900,
    minimumQuantity: 10,
  },
};

const priceCache = new Map<BillingPlan, { id: string; cachedAt: number }>();
const PRICE_CACHE_MS = 60_000;

type StripePriceLike = {
  active?: boolean;
  currency?: string;
  unit_amount?: number | null;
  recurring?: { interval?: string | null } | null;
  product?: unknown;
};

/**
 * Maps a Stripe price only when both the price and its product exactly match
 * one of our paid plans. Product metadata is deliberately not considered here.
 */
export function getTrustedPlanFromPrice(price: StripePriceLike, product?: unknown): BillingPlan | null {
  const rawProduct = product ?? price.product;
  const stripeProduct = rawProduct && typeof rawProduct === "object"
    ? rawProduct as { active?: boolean; name?: string | null }
    : undefined;
  if (
    !price.active ||
    price.currency !== "usd" ||
    price.recurring?.interval !== "month" ||
    !stripeProduct?.active
  ) {
    return null;
  }

  for (const [plan, config] of Object.entries(BILLING_PLANS) as [BillingPlan, typeof BILLING_PLANS[BillingPlan]][]) {
    if (stripeProduct.name === config.productName && price.unit_amount === config.unitAmount) {
      return plan;
    }
  }
  return null;
}

export async function getMonthlyPriceId(plan: BillingPlan): Promise<string> {
  const cached = priceCache.get(plan);
  if (cached && Date.now() - cached.cachedAt < PRICE_CACHE_MS) return cached.id;

  const stripe = await getUncachableStripeClient();
  const config = BILLING_PLANS[plan];
  const products = await stripe.products.search({
    query: `name:'${config.productName}' AND active:'true'`,
  });
  const product = products.data.find((candidate) => candidate.active && candidate.name === config.productName);
  if (!product) {
    throw new Error(`Stripe product "${config.productName}" not found. Run: pnpm --filter @workspace/api-server exec tsx src/scripts/seedStripeProducts.ts`);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const monthly = prices.data.find((price) => getTrustedPlanFromPrice(price, product) === plan);
  if (!monthly) {
    throw new Error(`No active monthly USD $${(config.unitAmount / 100).toFixed(2)} price found for "${config.productName}"`);
  }

  priceCache.set(plan, { id: monthly.id, cachedAt: Date.now() });
  return monthly.id;
}

export async function getTrustedSubscriptionSelection(subscription: any): Promise<TrustedSubscriptionSelection | null> {
  const items = subscription?.items?.data;
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    const price = item?.price;
    if (!price || typeof price === "string") continue;
    let product = price.product;
    if (typeof product === "string") {
      const stripe = await getUncachableStripeClient();
      product = await stripe.products.retrieve(product);
    }
    const plan = getTrustedPlanFromPrice(price, product);
    if (!plan) continue;
    const quantity = Number(item?.quantity);
    const validated = validateCheckoutSelection({ plan, quantity });
    if (validated.data) return validated.data;
  }
  return null;
}

export async function getTrustedPlanFromSubscription(subscription: any): Promise<BillingPlan | null> {
  return (await getTrustedSubscriptionSelection(subscription))?.plan ?? null;
}