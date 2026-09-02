import { describe, expect, it } from "vitest";
import { calculateDealScore, calculateEffectivePrice } from "@/lib/decision/dealEngine";
import type { Product } from "@/types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "gpu-1",
    name: "RTX 5070",
    category: "gpu",
    price: 700,
    currency: "CAD",
    availability: "in_stock",
    source: "test",
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("calculateEffectivePrice", () => {
  it("sums item price, known shipping, and mandatory fees", () => {
    const result = calculateEffectivePrice(makeProduct({ price: 700, shippingCost: 15 }), 5);
    expect(result.effectivePrice).toBe(720);
    expect(result.shippingVerified).toBe(true);
  });

  it("REQUIRED: treats unknown shipping as unverified, not silently free", () => {
    const result = calculateEffectivePrice(makeProduct({ shippingCost: undefined }));
    expect(result.shippingVerified).toBe(false);
    expect(result.shippingCost).toBe(0); // used as the numeric default for the sum, but flagged unverified
  });

  it("REQUIRED: never fabricates a discount when no original price is present", () => {
    const result = calculateEffectivePrice(makeProduct({ originalPrice: undefined }));
    expect(result.discountVerified).toBe(false);
    expect(result.verifiedSavings).toBe(0);
  });

  it("computes verified savings only when originalPrice exceeds price", () => {
    const result = calculateEffectivePrice(makeProduct({ price: 700, originalPrice: 799 }));
    expect(result.discountVerified).toBe(true);
    expect(result.verifiedSavings).toBe(99);
  });

  it("does not treat a lower 'original' price as a discount (bad data guard)", () => {
    const result = calculateEffectivePrice(makeProduct({ price: 700, originalPrice: 650 }));
    expect(result.discountVerified).toBe(false);
  });

  it("REQUIRED: effectivePrice is undefined when item price itself is unknown", () => {
    const result = calculateEffectivePrice(makeProduct({ price: undefined }));
    expect(result.effectivePrice).toBeUndefined();
  });
});

describe("calculateDealScore", () => {
  it("REQUIRED: eliminates a product on a high-confidence compatibility failure rather than merely scoring it lower", () => {
    const product = makeProduct();
    const score = calculateDealScore({
      product,
      effectivePrice: calculateEffectivePrice(product),
      compatibilityIssues: [
        {
          involving: [product.id, "some motherboard"],
          result: { compatible: false, confidence: "high", reasons: ["no PCIe x16 slot"] },
        },
      ],
    });
    expect(score.eliminated).toBe(true);
    expect(score.total).toBe(0);
  });

  it("does not eliminate on a low-confidence compatibility concern, but does lower the score", () => {
    const product = makeProduct();
    const score = calculateDealScore({
      product,
      effectivePrice: calculateEffectivePrice(product),
      compatibilityIssues: [
        {
          involving: [product.id, "some motherboard"],
          result: { compatible: false, confidence: "low", reasons: ["unknown slot count"] },
        },
      ],
    });
    expect(score.eliminated).toBe(false);
    expect(score.breakdown.compatibility).toBeLessThan(100);
  });

  it("scores a cheaper-than-median product higher on value", () => {
    const product = makeProduct({ price: 600 });
    const score = calculateDealScore({
      product,
      effectivePrice: calculateEffectivePrice(product),
      compatibilityIssues: [],
      comparableMedianEffectivePrice: 700,
    });
    expect(score.breakdown.value).toBeGreaterThan(50);
  });

  it("does not penalize meetsRequirements when no budget was stated", () => {
    const product = makeProduct();
    const score = calculateDealScore({
      product,
      effectivePrice: calculateEffectivePrice(product),
      compatibilityIssues: [],
      meetsBudget: undefined,
    });
    expect(score.breakdown.meetsRequirements).toBe(50);
  });

  it("scores out-of-budget candidates poorly on meetsRequirements", () => {
    const product = makeProduct();
    const score = calculateDealScore({
      product,
      effectivePrice: calculateEffectivePrice(product),
      compatibilityIssues: [],
      meetsBudget: false,
    });
    expect(score.breakdown.meetsRequirements).toBeLessThan(50);
  });
});
