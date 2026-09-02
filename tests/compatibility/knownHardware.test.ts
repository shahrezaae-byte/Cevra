import { describe, expect, it } from "vitest";
import { resolveKnownCpuSpec, resolveKnownMotherboardSpec } from "@/lib/compatibility/knownHardware";
import { checkCpuMotherboardCompatibility } from "@/lib/compatibility/cpu";

describe("known hardware resolution feeding the compatibility engine", () => {
  it("REQUIRED ACCEPTANCE TEST: i9-14900K + ASRock B550M-HDV resolves to a hard incompatibility", () => {
    const cpuName = "Intel Core i9-14900K";
    const moboName = "ASRock B550M-HDV";

    const cpuSpec = resolveKnownCpuSpec(cpuName);
    const moboSpec = resolveKnownMotherboardSpec(moboName);

    expect(cpuSpec.socket).toBe("LGA1700");
    expect(moboSpec.socket).toBe("AM4");

    const result = checkCpuMotherboardCompatibility(
      { name: cpuName, ...cpuSpec },
      { name: moboName, ...moboSpec }
    );

    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("high");
    expect(result.reasons.join(" ")).toMatch(/LGA1700/);
    expect(result.reasons.join(" ")).toMatch(/AM4/);
  });

  it("returns unknown-socket specs for unlisted hardware rather than guessing", () => {
    const spec = resolveKnownCpuSpec("Some Future CPU 9999X");
    expect(spec.socket).toBe("unknown");
  });
});
