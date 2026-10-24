import { describe, expect, it } from "vitest";
import { canonicalPlan, employeeSeatLimit, hasActiveAccess, isTeamEntitled } from "./entitlements";

function company(overrides: Record<string, unknown> = {}) {
  return {
    plan: "free",
    subscriptionStatus: null,
    stripeSeatQuantity: null,
    trialEndsAt: null,
    ...overrides,
  } as any;
}

describe("plan entitlements", () => {
  it("grants explicitly complimentary companies Team access without a subscription or trial", () => {
    const complimentary = company({ plan: "trial", complimentaryTeamAccess: true });
    expect(hasActiveAccess(complimentary)).toBe(true);
    expect(isTeamEntitled(complimentary)).toBe(true);
    expect(employeeSeatLimit(complimentary)).toBe(Number.POSITIVE_INFINITY);
  });

  it("does not bypass billing merely because an account is an admin or a trial exists", () => {
    const expired = company({ plan: "trial", complimentaryTeamAccess: false });
    expect(hasActiveAccess(expired)).toBe(false);
    expect(isTeamEntitled(expired)).toBe(false);
    expect(employeeSeatLimit(expired)).toBeNull();
  });
  it("normalizes the historical pro value without treating unknown plans as paid", () => {
    expect(canonicalPlan("pro")).toBe("professional");
    expect(canonicalPlan("enterprise")).toBe("free");
  });

  it("does not grant access merely because an unknown Stripe subscription is active", () => {
    expect(hasActiveAccess(company({ plan: "free", subscriptionStatus: "active" }))).toBe(false);
    expect(employeeSeatLimit(company({ plan: "free", subscriptionStatus: "active" }))).toBeNull();
  });

  it("limits Professional to one seat and Team to its paid quantity", () => {
    expect(employeeSeatLimit(company({ plan: "professional", subscriptionStatus: "active", stripeSeatQuantity: 1 }))).toBe(1);
    expect(employeeSeatLimit(company({ plan: "team", subscriptionStatus: "active", stripeSeatQuantity: 14 }))).toBe(14);
  });

  it("rejects invalid Team quantities and preserves Team access during an active internal trial", () => {
    expect(employeeSeatLimit(company({ plan: "team", subscriptionStatus: "active", stripeSeatQuantity: 9 }))).toBeNull();
    const trial = company({ plan: "trial", trialEndsAt: new Date(Date.now() + 60_000) });
    expect(isTeamEntitled(trial)).toBe(true);
    expect(employeeSeatLimit(trial)).toBe(Number.POSITIVE_INFINITY);
  });
});