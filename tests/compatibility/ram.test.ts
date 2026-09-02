import { describe, expect, it } from "vitest";
import { checkRamMotherboardCompatibility } from "@/lib/compatibility/ram";

describe("checkRamMotherboardCompatibility", () => {
  it("REQUIRED: flags DDR4 RAM on a DDR5-only motherboard as incompatible", () => {
    const ram = { name: "Corsair Vengeance 32GB", generation: "DDR4" as const, capacityGb: 32 };
    const motherboard = {
      name: "MSI PRO Z790",
      socket: "LGA1700" as const,
      formFactor: "ATX" as const,
      memoryGeneration: "DDR5" as const,
    };

    const result = checkRamMotherboardCompatibility(ram, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/DDR4/);
    expect(result.reasons.join(" ")).toMatch(/DDR5/);
  });

  it("REQUIRED: flags DDR5 RAM on a DDR4-only motherboard as incompatible", () => {
    const ram = { name: "G.Skill Trident Z5 32GB", generation: "DDR5" as const, capacityGb: 32 };
    const motherboard = {
      name: "ASRock B550M-HDV",
      socket: "AM4" as const,
      formFactor: "Micro-ATX" as const,
      memoryGeneration: "DDR4" as const,
    };

    const result = checkRamMotherboardCompatibility(ram, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/DDR5/);
    expect(result.reasons.join(" ")).toMatch(/DDR4/);
  });

  it("treats matching DDR4 generation as compatible", () => {
    const ram = { name: "Kingston Fury 32GB", generation: "DDR4" as const, capacityGb: 32, modules: 2 };
    const motherboard = {
      name: "ASRock B550M-HDV",
      socket: "AM4" as const,
      formFactor: "Micro-ATX" as const,
      memoryGeneration: "DDR4" as const,
      memorySlots: 4,
      maxMemoryGb: 128,
    };

    const result = checkRamMotherboardCompatibility(ram, motherboard);

    expect(result.compatible).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("flags a kit with more modules than available slots", () => {
    const ram = { name: "4x8GB DDR4 kit", generation: "DDR4" as const, capacityGb: 32, modules: 4 };
    const motherboard = {
      name: "Mini-ITX board",
      socket: "AM4" as const,
      formFactor: "Mini-ITX" as const,
      memoryGeneration: "DDR4" as const,
      memorySlots: 2,
    };

    const result = checkRamMotherboardCompatibility(ram, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/slots/);
  });

  it("flags total capacity exceeding the motherboard's stated maximum", () => {
    const ram = { name: "128GB DDR4 kit", generation: "DDR4" as const, capacityGb: 128 };
    const motherboard = {
      name: "Budget B450 board",
      socket: "AM4" as const,
      formFactor: "Micro-ATX" as const,
      memoryGeneration: "DDR4" as const,
      maxMemoryGb: 64,
    };

    const result = checkRamMotherboardCompatibility(ram, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/maximum/);
  });

  it("returns low confidence when generation is unknown for either part", () => {
    const ram = { name: "Unlabeled RAM", generation: "unknown" as const, capacityGb: 16 };
    const motherboard = {
      name: "ASRock B550M-HDV",
      socket: "AM4" as const,
      formFactor: "Micro-ATX" as const,
      memoryGeneration: "DDR4" as const,
    };

    const result = checkRamMotherboardCompatibility(ram, motherboard);

    expect(result.confidence).toBe("low");
  });
});
