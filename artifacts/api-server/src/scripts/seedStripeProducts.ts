/**
 * Seeds the two canonical monthly Stripe subscription products. Idempotent —
 * safe to re-run. Existing products and matching active prices are reused.
 *
 * Run with:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/seedStripeProducts.ts
 */
import { getUncachableStripeClient } from "../lib/stripeClient";

const PLANS = [
  {
    plan: "professional",
    name: "Professional - For individual contributors",
    description: "Proven Path Professional subscription — full platform access",
    unitAmount: 999,
  },
  {
    plan: "team",
    name: "Team - For growing HR teams",
    description: "Proven Path Team subscription — per-user platform access",
    unitAmount: 2900,
  },
] as const;

async function ensurePlan(
  stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>,
  plan: (typeof PLANS)[number],
): Promise<void> {
  const existing = await stripe.products.search({ query: `name:'${plan.name}' AND active:'true'` });
  let product = existing.data.find((candidate) => candidate.active && candidate.name === plan.name);
  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { plan: plan.plan },
    });
    console.log(`Created product: ${product.id}`);
  } else {
    console.log(`Product already exists: ${product.id}`);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const monthly = prices.data.find(
    (price) =>
      price.active &&
      price.currency === "usd" &&
      price.recurring?.interval === "month" &&
      price.unit_amount === plan.unitAmount,
  );
  if (monthly) {
    console.log(`Monthly price already exists: ${monthly.id}`);
    return;
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { plan: plan.plan },
  });
  console.log(`Created monthly price: ${price.id}`);
}

async function main(): Promise<void> {
  const stripe = await getUncachableStripeClient();
  for (const plan of PLANS) await ensurePlan(stripe, plan);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});