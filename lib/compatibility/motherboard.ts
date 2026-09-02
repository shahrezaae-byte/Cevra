import type { CompatibilityResult, MotherboardFormFactor } from "@/types/hardware";

/**
 * Which case form factors can physically accept which motherboard form
 * factors. Smaller boards fit in larger cases, not the reverse.
 */
const FORM_FACTOR_FIT: Record<MotherboardFormFactor, MotherboardFormFactor[]> = {
  "E-ATX": ["E-ATX"],
  ATX: ["E-ATX", "ATX"],
  "Micro-ATX": ["E-ATX", "ATX", "Micro-ATX"],
  "Mini-ITX": ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"],
  unknown: [],
};

/**
 * Deterministic motherboard <-> case form-factor check.
 * `caseSupportedFormFactors` is whatever the case manufacturer lists as
 * supported motherboard sizes.
 */
export function checkMotherboardFormFactorCompatibility(
  motherboardName: string,
  motherboardFormFactor: MotherboardFormFactor,
  caseName: string,
  caseSupportedFormFactors: MotherboardFormFactor[]
): CompatibilityResult {
  if (
    motherboardFormFactor === "unknown" ||
    caseSupportedFormFactors.length === 0
  ) {
    return {
      compatible: false,
      confidence: "low",
      reasons: [
        `Could not determine form-factor compatibility between ${motherboardName} and ${caseName} from the available data.`,
      ],
    };
  }

  const fits = caseSupportedFormFactors.some((supported) =>
    FORM_FACTOR_FIT[supported]?.includes(motherboardFormFactor)
  );

  if (fits) {
    return {
      compatible: true,
      confidence: "high",
      reasons: [`${motherboardName} (${motherboardFormFactor}) fits in ${caseName}.`],
    };
  }

  return {
    compatible: false,
    confidence: "high",
    reasons: [
      `${motherboardName} is ${motherboardFormFactor}, which ${caseName} does not support (supports: ${caseSupportedFormFactors.join(", ")}).`,
    ],
  };
}
