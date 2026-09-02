import { describe, expect, it } from "vitest";
import {
  checkGpuCaseClearance,
  checkGpuMotherboardCompatibility,
} from "@/lib/compatibility/gpu";

describe("checkGpuMotherboardCompatibility", () => {
  it("is compatible (medium confidence) when the board has a free PCIe x16 slot", () => {
    const gpu = { name: "RTX 4070" };
    const motherboard = { name: "MSI B550", socket: "AM4" as const, formFactor: "ATX" as const, memoryGeneration: "DDR4" as const, pcieX16Slots: 1 };

    const result = checkGpuMotherboardCompatibility(gpu, motherboard);

    expect(result.compatible).toBe(true);
    expect(result.confidence).toBe("medium");
  });

  it("is incompatible when the board has no PCIe x16 slots", () => {
    const gpu = { name: "RTX 4070" };
    const motherboard = { name: "Odd board", socket: "AM4" as const, formFactor: "Mini-ITX" as const, memoryGeneration: "DDR4" as const, pcieX16Slots: 0 };

    const result = checkGpuMotherboardCompatibility(gpu, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("high");
  });

  it("returns low confidence when slot count is unknown", () => {
    const gpu = { name: "RTX 4070" };
    const motherboard = { name: "Unknown board", socket: "AM4" as const, formFactor: "ATX" as const, memoryGeneration: "DDR4" as const };

    const result = checkGpuMotherboardCompatibility(gpu, motherboard);

    expect(result.confidence).toBe("low");
  });
});

describe("checkGpuCaseClearance", () => {
  it("flags a GPU that is too long for the case", () => {
    const result = checkGpuCaseClearance({ name: "RTX 4090", lengthMm: 336 }, "Small ITX case", 300);
    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("high");
  });

  it("passes when the GPU fits within case clearance", () => {
    const result = checkGpuCaseClearance({ name: "RTX 4060", lengthMm: 240 }, "Mid tower", 330);
    expect(result.compatible).toBe(true);
  });

  it("returns low confidence when dimensions are unknown", () => {
    const result = checkGpuCaseClearance({ name: "RTX 4060" }, "Mid tower", undefined);
    expect(result.confidence).toBe("low");
  });
});
