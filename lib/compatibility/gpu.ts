import type {
  CompatibilityResult,
  GpuSpec,
  MotherboardSpec,
} from "@/types/hardware";

export interface NamedGpu extends GpuSpec {
  name: string;
}
export interface NamedMotherboard extends MotherboardSpec {
  name: string;
}

/**
 * Deterministic GPU <-> motherboard check.
 *
 * GPU compatibility is only "fully" deterministic for the interface slot
 * (PCIe x16) and, when case dimensions are known, physical clearance.
 * Real-world fit (case clearance, cable routing) often isn't verifiable
 * from spec data alone, so this intentionally returns low confidence
 * rather than a false "compatible: true" when data is missing.
 */
export function checkGpuMotherboardCompatibility(
  gpu: NamedGpu,
  motherboard: NamedMotherboard
): CompatibilityResult {
  if (motherboard.pcieX16Slots === undefined) {
    return {
      compatible: false,
      confidence: "low",
      reasons: [
        `${motherboard.name}'s PCIe x16 slot count is unknown, so GPU slot compatibility cannot be confirmed.`,
      ],
    };
  }

  if (motherboard.pcieX16Slots < 1) {
    return {
      compatible: false,
      confidence: "high",
      reasons: [`${motherboard.name} has no PCIe x16 slot available for ${gpu.name}.`],
    };
  }

  return {
    compatible: true,
    confidence: "medium",
    reasons: [
      `${motherboard.name} has a PCIe x16 slot for ${gpu.name}. Physical case clearance was not verified.`,
    ],
  };
}

/**
 * Deterministic GPU <-> case physical-fit check, only run when both the
 * GPU length and the case's maximum GPU clearance are known.
 */
export function checkGpuCaseClearance(
  gpu: NamedGpu,
  caseName: string,
  caseMaxGpuLengthMm?: number
): CompatibilityResult {
  if (gpu.lengthMm === undefined || caseMaxGpuLengthMm === undefined) {
    return {
      compatible: false,
      confidence: "low",
      reasons: [
        `GPU length or ${caseName}'s clearance is unknown, so physical fit cannot be confirmed.`,
      ],
    };
  }

  if (gpu.lengthMm > caseMaxGpuLengthMm) {
    return {
      compatible: false,
      confidence: "high",
      reasons: [
        `${gpu.name} is ${gpu.lengthMm}mm long, which exceeds ${caseName}'s maximum GPU clearance of ${caseMaxGpuLengthMm}mm.`,
      ],
    };
  }

  return {
    compatible: true,
    confidence: "high",
    reasons: [`${gpu.name} (${gpu.lengthMm}mm) fits within ${caseName}'s clearance of ${caseMaxGpuLengthMm}mm.`],
  };
}
