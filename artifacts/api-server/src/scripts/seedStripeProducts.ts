/**
 * Seeds the "Proven Path Pro" subscription product and its monthly price in Stripe.
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/seedStripeProducts.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

const PRODUCT_NAME = "Proven Path Pro";
const MONTHLY_AMOUNT = 999; // $9.99/month

async function main(): Promise<void> {
  const stripe = await getUncachableStripeClient();
  console.log("Searching for existing product...");
  const existing = await stripe.products.search({ query: `name:'${PRODUCT_NAME}' AND active:'true'` });
  let productId: string;
  if (existing.data.length > 0) {
    productId = existing.data[0].id;
    console.log(`Product already exists: ${productId}`);
  } else {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: "Proven Path Professional subscription — full platform access",
    });
    productId = product.id;
    console.log(`Created product: ${productId}`);
  }

  const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
  const hasMonthly = prices.data.find((p) => p.recurring?.interval === "month" && p.unit_amount === MONTHLY_AMOUNT);
  if (hasMonthly) {
    console.log(`Monthly price already exists: ${hasMonthly.id}`);
  } else {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: MONTHLY_AMOUNT,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`Created monthly price: ${price.id}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
