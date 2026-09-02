import { describe, expect, it } from "vitest";
import { checkCpuMotherboardCompatibility } from "@/lib/compatibility/cpu";

describe("checkCpuMotherboardCompatibility", () => {
  it("REQUIRED: flags Intel LGA1700 CPU on an AMD AM4 board as incompatible", () => {
    const cpu = { name: "Intel Core i9-14900K", socket: "LGA1700" as const };
    const motherboard = { name: "ASRock B550M-HDV", socket: "AM4" as const };

    const result = checkCpuMotherboardCompatibility(cpu, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("high");
    expect(result.reasons.join(" ")).toMatch(/LGA1700/);
    expect(result.reasons.join(" ")).toMatch(/AM4/);
  });

  it("treats matching AM4 sockets as compatible", () => {
    const cpu = { name: "AMD Ryzen 7 5800X3D", socket: "AM4" as const };
    const motherboard = { name: "MSI B450 Tomahawk", socket: "AM4" as const };

    const result = checkCpuMotherboardCompatibility(cpu, motherboard);

    expect(result.compatible).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("treats matching LGA1700 sockets as compatible", () => {
    const cpu = { name: "Intel Core i5-13600K", socket: "LGA1700" as const };
    const motherboard = { name: "Gigabyte B760M", socket: "LGA1700" as const };

    const result = checkCpuMotherboardCompatibility(cpu, motherboard);

    expect(result.compatible).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("returns low confidence, not a false positive, when a socket is unknown", () => {
    const cpu = { name: "Mystery CPU", socket: "unknown" as const };
    const motherboard = { name: "ASRock B550M-HDV", socket: "AM4" as const };

    const result = checkCpuMotherboardCompatibility(cpu, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("low");
  });

  it("flags AMD AM5 on an AM4 board as incompatible despite same platform", () => {
    const cpu = { name: "AMD Ryzen 9 7950X", socket: "AM5" as const };
    const motherboard = { name: "ASRock B550M-HDV", socket: "AM4" as const };

    const result = checkCpuMotherboardCompatibility(cpu, motherboard);

    expect(result.compatible).toBe(false);
    expect(result.confidence).toBe("high");
  });
});
