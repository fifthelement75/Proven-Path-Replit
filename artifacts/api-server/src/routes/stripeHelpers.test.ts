import { describe, expect, it } from "vitest";
import {
  BILLING_PLANS,
  getTrustedPlanFromPrice,
  getTrustedSubscriptionSelection,
  validateCheckoutSelection,
} from "./stripeHelpers";

describe("checkoutSelectionSchema", () => {
  it("accepts the canonical professional selection only at quantity one", () => {
    expect(validateCheckoutSelection({ plan: "professional", quantity: 1 }).data).toBeDefined();
    expect(validateCheckoutSelection({ plan: "professional", quantity: 2 }).data).toBeUndefined();
  });

  it("requires team subscriptions to have at least ten seats", () => {
    expect(validateCheckoutSelection({ plan: "team", quantity: 10 }).data).toBeDefined();
    expect(validateCheckoutSelection({ plan: "team", quantity: 9 }).data).toBeUndefined();
  });

  it("rejects unknown plan names and non-integer quantities", () => {
    expect(validateCheckoutSelection({ plan: "pro", quantity: 1 }).data).toBeUndefined();
    expect(validateCheckoutSelection({ plan: "team", quantity: 10.5 }).data).toBeUndefined();
  });
});

describe("getTrustedPlanFromPrice", () => {
  const professional = BILLING_PLANS.professional;
  const validProfessionalPrice = {
    active: true,
    currency: "usd",
    unit_amount: professional.unitAmount,
    recurring: { interval: "month" },
  };

  it("maps only exact active monthly USD product/price pairs", () => {
    expect(getTrustedPlanFromPrice(validProfessionalPrice, {
      active: true,
      name: professional.productName,
    })).toBe("professional");
    expect(getTrustedPlanFromPrice({
      ...validProfessionalPrice,
      unit_amount: BILLING_PLANS.team.unitAmount,
    }, { active: true, name: professional.productName })).toBeNull();
  });

  it("does not trust product metadata or inactive/non-monthly prices", () => {
    expect(getTrustedPlanFromPrice(validProfessionalPrice, {
      active: true,
      name: "Anything else",
    })).toBeNull();
    expect(getTrustedPlanFromPrice({
      ...validProfessionalPrice,
      recurring: { interval: "year" },
    }, { active: true, name: professional.productName })).toBeNull();
  });
});

describe("getTrustedSubscriptionSelection", () => {
  const team = BILLING_PLANS.team;
  const teamPrice = {
    active: true,
    currency: "usd",
    unit_amount: team.unitAmount,
    recurring: { interval: "month" },
    product: { active: true, name: team.productName },
  };

  it("returns the trusted Team quantity when it meets the minimum", async () => {
    await expect(getTrustedSubscriptionSelection({
      items: { data: [{ quantity: 12, price: teamPrice }] },
    })).resolves.toEqual({ plan: "team", quantity: 12 });
  });

  it("rejects a recognized Team price below the ten-seat minimum", async () => {
    await expect(getTrustedSubscriptionSelection({
      items: { data: [{ quantity: 9, price: teamPrice }] },
    })).resolves.toBeNull();
  });
});