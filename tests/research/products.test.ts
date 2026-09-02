import { describe, expect, it } from "vitest";
import { normalizeSerpApiShoppingResult } from "@/lib/research/products";

const RETRIEVED_AT = "2026-08-31T00:00:00.000Z";

describe("normalizeSerpApiShoppingResult", () => {
  it("parses a well-formed result including price, shipping, and discount", () => {
    const product = normalizeSerpApiShoppingResult(
      {
        title: "NVIDIA RTX 5070 Founders Edition",
        extracted_price: 699.99,
        price: "$699.99",
        extracted_old_price: 799.99,
        shipping: "Free shipping",
        source: "Best Buy",
        product_link: "https://example.com/rtx5070",
        thumbnail: "https://example.com/rtx5070.jpg",
        availability: "In stock",
      },
      "gpu",
      RETRIEVED_AT
    );

    expect(product.name).toBe("NVIDIA RTX 5070 Founders Edition");
    expect(product.price).toBe(699.99);
    expect(product.originalPrice).toBe(799.99);
    expect(product.shippingCost).toBe(0);
    expect(product.retailer).toBe("Best Buy");
    expect(product.url).toBe("https://example.com/rtx5070");
    expect(product.imageUrl).toBe("https://example.com/rtx5070.jpg");
    expect(product.availability).toBe("in_stock");
    expect(product.brand).toBe("NVIDIA");
  });

  it("REQUIRED: never invents a price when one isn't present", () => {
    const product = normalizeSerpApiShoppingResult(
      { title: "Mystery GPU", source: "Some Retailer" },
      "gpu",
      RETRIEVED_AT
    );
    expect(product.price).toBeUndefined();
  });

  it("REQUIRED: never invents a URL when one isn't present", () => {
    const product = normalizeSerpApiShoppingResult(
      { title: "Mystery GPU", extracted_price: 500 },
      "gpu",
      RETRIEVED_AT
    );
    expect(product.url).toBeUndefined();
  });

  it("REQUIRED: leaves shippingCost unknown (undefined) rather than defaulting to 0 when unspecified", () => {
    const product = normalizeSerpApiShoppingResult(
      { title: "Mystery GPU", extracted_price: 500 },
      "gpu",
      RETRIEVED_AT
    );
    expect(product.shippingCost).toBeUndefined();
  });

  it("parses a numeric shipping string as a dollar amount", () => {
    const product = normalizeSerpApiShoppingResult(
      { title: "Mystery GPU", extracted_price: 500, shipping: "$8.99 shipping" },
      "gpu",
      RETRIEVED_AT
    );
    expect(product.shippingCost).toBe(8.99);
  });

  it("REQUIRED: does not report a discount when no original price is present", () => {
    const product = normalizeSerpApiShoppingResult(
      { title: "Mystery GPU", extracted_price: 500 },
      "gpu",
      RETRIEVED_AT
    );
    expect(product.originalPrice).toBeUndefined();
  });

  it("handles completely malformed/empty provider data without throwing", () => {
    const product = normalizeSerpApiShoppingResult({}, "gpu", RETRIEVED_AT);
    expect(product.name).toBe("Unknown product");
    expect(product.price).toBeUndefined();
    expect(product.id).toBeTruthy();
  });

  it("handles malformed field types (wrong type for expected fields) without throwing", () => {
    const product = normalizeSerpApiShoppingResult(
      {
        title: 12345,
        extracted_price: "not-a-number",
        shipping: { weird: "object" },
        source: null,
        product_link: 99,
      },
      "gpu",
      RETRIEVED_AT
    );
    expect(product.name).toBe("Unknown product");
    expect(product.price).toBeUndefined();
    expect(product.shippingCost).toBeUndefined();
    expect(product.retailer).toBeUndefined();
    expect(product.url).toBeUndefined();
  });

  it("falls back to category 'other' when no category is supplied", () => {
    const product = normalizeSerpApiShoppingResult({ title: "AirPods Pro 2" }, undefined, RETRIEVED_AT);
    expect(product.category).toBe("other");
  });
});
