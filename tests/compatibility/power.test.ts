import { describe, expect, it } from "vitest";
import { checkPsuCompatibility } from "@/lib/compatibility/power";

describe("checkPsuCompatibility", () => {
  it("uses the GPU manufacturer's recommended wattage when available", () => {
    const psu = { name: "Corsair RM650", wattage: 650 };
    const result = checkPsuCompatibility(psu, { gpuRecommendedPsuWatts: 750 });

    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("high");
  });

  it("passes when PSU wattage meets the GPU recommendation", () => {
    const psu = { name: "Corsair RM850", wattage: 850 };
    const result = checkPsuCompatibility(psu, { gpuRecommendedPsuWatts: 750 });

    expect(result.compatible).toBe(true);
  });

  it("estimates load from CPU+GPU TDP with a safety margin when no GPU recommendation exists", () => {
    const psu = { name: "Budget 450W", wattage: 450 };
    const result = checkPsuCompatibility(psu, { cpuTdpWatts: 125, gpuTdpWatts: 320 });

    // (125+320+100) * 1.2 = 654W recommended -> 450W is insufficient
    expect(result.compatible).toBe(false);
  });

  it("returns low confidence when no power data is available at all", () => {
    const psu = { name: "Unknown PSU", wattage: 650 };
    const result = checkPsuCompatibility(psu, {});

    expect(result.confidence).toBe("low");
    expect(result.compatible).toBe(false);
  });
});
