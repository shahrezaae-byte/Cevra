import { describe, expect, it } from "vitest";
import { getPurchaseDecision } from "@/lib/decision/purchaseDecision";
import type { DealScoreResult } from "@/lib/decision/dealEngine";

function makeScore(total: number): DealScoreResult {
  return {
    productId: "p1",
    eliminated: false,
    total,
    breakdown: { value: total, compatibility: 100, availability: 100, meetsRequirements: 100, discount: 50 },
  };
}

describe("getPurchaseDecision", () => {
  it("REQUIRED: returns SKIP when every candidate was eliminated (e.g. all incompatible)", () => {
    const decision = getPurchaseDecision({
      allEliminated: true,
      discountVerified: false,
      hasComparableAlternatives: false,
    });
    expect(decision).toBe("SKIP");
  });

  it("returns UNKNOWN when there is no best deal score to evaluate", () => {
    const decision = getPurchaseDecision({
      allEliminated: false,
      discountVerified: false,
      hasComparableAlternatives: false,
    });
    expect(decision).toBe("UNKNOWN");
  });

  it("returns SKIP when the best candidate doesn't meet the stated budget", () => {
    const decision = getPurchaseDecision({
      allEliminated: false,
      bestDealScore: makeScore(90),
      meetsBudget: false,
      discountVerified: false,
      hasComparableAlternatives: true,
    });
    expect(decision).toBe("SKIP");
  });

  it("returns BUY for a strong verified deal with alternatives to compare against", () => {
    const decision = getPurchaseDecision({
      allEliminated: false,
      bestDealScore: makeScore(85),
      discountVerified: true,
      hasComparableAlternatives: true,
    });
    expect(decision).toBe("BUY");
  });

  it("returns WAIT for a mediocre (not poor, not strong) score with alternatives available", () => {
    const decision = getPurchaseDecision({
      allEliminated: false,
      bestDealScore: makeScore(55),
      discountVerified: false,
      hasComparableAlternatives: true,
    });
    expect(decision).toBe("WAIT");
  });

  it("REQUIRED: returns UNKNOWN rather than WAIT/BUY when there's only one candidate and nothing to compare it against", () => {
    const decision = getPurchaseDecision({
      allEliminated: false,
      bestDealScore: makeScore(55),
      discountVerified: false,
      hasComparableAlternatives: false,
    });
    expect(decision).toBe("UNKNOWN");
  });

  it("returns SKIP for a very poor deal score even with alternatives", () => {
    const decision = getPurchaseDecision({
      allEliminated: false,
      bestDealScore: makeScore(20),
      discountVerified: false,
      hasComparableAlternatives: true,
    });
    expect(decision).toBe("SKIP");
  });
});
