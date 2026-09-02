import { describe, expect, it } from "vitest";
import { calculateProductScore, median } from "@/lib/decision/scoring";
import type { Product } from "@/types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "ram-1",
    name: "Test RAM",
    category: "ram",
    price: 100,
    currency: "CAD",
    availability: "in_stock",
    source: "test",
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("calculateProductScore", () => {
  it("scores a compatible, in-stock, fairly-priced product highly", () => {
    const score = calculateProductScore({
      product: makeProduct({ price: 90 }),
      compatibilityIssues: [],
      comparableMedianPrice: 100,
    });
    expect(score.total).toBeGreaterThan(60);
  });

  it("zeroes out the compatibility subscore on a high-confidence failure", () => {
    const score = calculateProductScore({
      product: makeProduct(),
      compatibilityIssues: [
        {
          involving: ["ram-1"],
          result: { compatible: false, confidence: "high", reasons: ["mismatch"] },
        },
      ],
    });
    expect(score.breakdown.compatibility).toBe(0);
  });

  it("does not fabricate a value score when price data is missing", () => {
    const score = calculateProductScore({
      product: makeProduct({ price: undefined }),
      compatibilityIssues: [],
    });
    expect(score.breakdown.value).toBe(50);
  });

  it("scores out-of-stock availability at zero", () => {
    const score = calculateProductScore({
      product: makeProduct({ availability: "out_of_stock" }),
      compatibilityIssues: [],
    });
    expect(score.breakdown.availability).toBe(0);
  });
});

describe("median", () => {
  it("returns undefined for an empty array", () => {
    expect(median([])).toBeUndefined();
  });

  it("computes the median for odd and even length arrays", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
