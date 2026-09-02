import { describe, expect, it } from "vitest";
import {
  checkExistingComponentCompatibility,
  checkNewProductsAgainstExistingMotherboard,
} from "@/lib/compatibility/existingComponents";
import type { Product } from "@/types/product";

describe("checkExistingComponentCompatibility", () => {
  it("REQUIRED: flags the i9-14900K + B550M-HDV pairing as a hard incompatibility", () => {
    const issues = checkExistingComponentCompatibility([
      { category: "cpu", name: "Intel Core i9-14900K" },
      { category: "motherboard", name: "ASRock B550M-HDV" },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].result.compatible).toBe(false);
    expect(issues[0].result.confidence).toBe("high");
  });

  it("returns no issues when there's no CPU+motherboard pair to check", () => {
    const issues = checkExistingComponentCompatibility([{ category: "ram", name: "Some RAM" }]);
    expect(issues).toHaveLength(0);
  });

  it("returns no issues when existingComponents is missing entirely", () => {
    expect(checkExistingComponentCompatibility(undefined)).toHaveLength(0);
  });

  it("returns compatible for a known-good pairing", () => {
    const issues = checkExistingComponentCompatibility([
      { category: "cpu", name: "AMD Ryzen 7 5800X3D" },
      { category: "motherboard", name: "MSI B550 Tomahawk" },
    ]);
    expect(issues[0].result.compatible).toBe(true);
  });
});

function makeGpuProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "gpu-1",
    name: "RTX 5070",
    category: "gpu",
    specifications: { category: "gpu" },
    source: "test",
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("checkNewProductsAgainstExistingMotherboard", () => {
  it("checks a candidate GPU against the user's existing motherboard", () => {
    const issues = checkNewProductsAgainstExistingMotherboard(
      [makeGpuProduct()],
      [{ category: "motherboard", name: "ASRock B550M-HDV" }]
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].involving).toEqual(["gpu-1", "ASRock B550M-HDV"]);
  });

  it("returns no issues when no existing motherboard is provided", () => {
    const issues = checkNewProductsAgainstExistingMotherboard([makeGpuProduct()], []);
    expect(issues).toHaveLength(0);
  });

  it("checks candidate RAM against the existing motherboard's generation", () => {
    const ramProduct: Product = {
      id: "ram-1",
      name: "DDR5 32GB Kit",
      category: "ram",
      specifications: { category: "ram", generation: "DDR5", capacityGb: 32 },
      source: "test",
      retrievedAt: new Date().toISOString(),
    };
    const issues = checkNewProductsAgainstExistingMotherboard(
      [ramProduct],
      [{ category: "motherboard", name: "ASRock B550M-HDV" }] // DDR4-only board
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].result.compatible).toBe(false);
  });
});
