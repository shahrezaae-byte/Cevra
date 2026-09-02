import type { CompatibilityResult, PsuSpec } from "@/types/hardware";

export interface NamedPsu extends PsuSpec {
  name: string;
}

export interface SystemPowerComponents {
  cpuTdpWatts?: number;
  gpuTdpWatts?: number;
  gpuRecommendedPsuWatts?: number;
  /** Flat estimate for everything else: board, drives, fans, RGB, etc. */
  baselineOverheadWatts?: number;
}

const DEFAULT_OVERHEAD_WATTS = 100;
/** Safety margin so the PSU isn't run at the edge of its rated capacity. */
const SAFETY_MARGIN = 1.2;

/**
 * Deterministic PSU wattage check.
 *
 * If the GPU manufacturer publishes a recommended system PSU wattage, that
 * figure is treated as authoritative (it already bakes in its own margin).
 * Otherwise we sum known component TDPs plus a flat overhead estimate and
 * apply a 20% safety margin.
 */
export function checkPsuCompatibility(
  psu: NamedPsu,
  components: SystemPowerComponents
): CompatibilityResult {
  const reasons: string[] = [];

  if (components.gpuRecommendedPsuWatts !== undefined) {
    const required = components.gpuRecommendedPsuWatts;
    if (psu.wattage < required) {
      return {
        compatible: false,
        confidence: "high",
        reasons: [
          `The GPU's manufacturer-recommended PSU wattage is ${required}W, which exceeds ${psu.name}'s ${psu.wattage}W rating.`,
        ],
      };
    }
    return {
      compatible: true,
      confidence: "high",
      reasons: [
        `${psu.name} (${psu.wattage}W) meets the GPU's manufacturer-recommended ${required}W.`,
      ],
    };
  }

  const knownWatts = [components.cpuTdpWatts, components.gpuTdpWatts].filter(
    (w): w is number => w !== undefined
  );

  if (knownWatts.length === 0) {
    return {
      compatible: false,
      confidence: "low",
      reasons: [
        "No CPU or GPU power draw data available, so PSU sizing cannot be confirmed.",
      ],
    };
  }

  const overhead = components.baselineOverheadWatts ?? DEFAULT_OVERHEAD_WATTS;
  const estimatedLoad = knownWatts.reduce((sum, w) => sum + w, 0) + overhead;
  const recommendedWatts = Math.ceil(estimatedLoad * SAFETY_MARGIN);

  reasons.push(
    `Estimated system draw is ~${estimatedLoad}W (components) with a ${Math.round(
      (SAFETY_MARGIN - 1) * 100
    )}% safety margin, recommending a ${recommendedWatts}W+ PSU.`
  );

  if (psu.wattage < recommendedWatts) {
    return {
      compatible: false,
      confidence: knownWatts.length === 2 ? "high" : "medium",
      reasons: [
        ...reasons,
        `${psu.name} is rated for ${psu.wattage}W, below the recommended ${recommendedWatts}W.`,
      ],
    };
  }

  return {
    compatible: true,
    confidence: knownWatts.length === 2 ? "high" : "medium",
    reasons: [
      ...reasons,
      `${psu.name} (${psu.wattage}W) covers the estimated load.`,
    ],
  };
}
