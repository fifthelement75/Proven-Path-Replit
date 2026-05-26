import { getUncachableStripeClient } from "../lib/stripeClient";

const PRO_PRODUCT_NAME = "Proven Path Pro";

let cachedPriceId: string | null = null;
let cachedPriceAt = 0;
const PRICE_CACHE_MS = 60_000;

export async function getProMonthlyPriceId(): Promise<string> {
  if (cachedPriceId && Date.now() - cachedPriceAt < PRICE_CACHE_MS) {
    return cachedPriceId;
  }
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.search({ query: `name:'${PRO_PRODUCT_NAME}' AND active:'true'` });
  if (products.data.length === 0) {
    throw new Error(`Stripe product "${PRO_PRODUCT_NAME}" not found. Run: pnpm --filter @workspace/api-server exec tsx src/scripts/seedStripeProducts.ts`);
  }
  const product = products.data[0];
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  const monthly = prices.data.find((p) => p.recurring?.interval === "month") ?? prices.data[0];
  if (!monthly) throw new Error(`No active price found for product ${product.id}`);
  cachedPriceId = monthly.id;
  cachedPriceAt = Date.now();
  return monthly.id;
}
