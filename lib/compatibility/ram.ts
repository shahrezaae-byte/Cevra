import type {
  CompatibilityResult,
  MotherboardSpec,
  RamSpec,
} from "@/types/hardware";

export interface NamedRam extends RamSpec {
  name: string;
}
export interface NamedMotherboard extends MotherboardSpec {
  name: string;
}

/**
 * Deterministic RAM <-> motherboard check: memory generation, module count
 * against available slots, and total capacity against the board's stated
 * maximum. Each rule is independent so we can report every problem, not
 * just the first one found.
 */
export function checkRamMotherboardCompatibility(
  ram: NamedRam,
  motherboard: NamedMotherboard
): CompatibilityResult {
  const reasons: string[] = [];
  let compatible = true;
  let confidence: "high" | "medium" | "low" = "high";

  // Rule 1: memory generation (DDR4 vs DDR5 sockets are physically incompatible)
  if (ram.generation === "unknown" || motherboard.memoryGeneration === "unknown") {
    confidence = "low";
    reasons.push(
      `Could not determine the memory generation for ${
        ram.generation === "unknown" ? ram.name : motherboard.name
      }, so generation compatibility cannot be confirmed.`
    );
  } else if (ram.generation !== motherboard.memoryGeneration) {
    compatible = false;
    reasons.push(
      `${ram.name} is ${ram.generation}, but ${motherboard.name} only supports ${motherboard.memoryGeneration}. These are physically incompatible.`
    );
  } else {
    reasons.push(`${ram.name} (${ram.generation}) matches ${motherboard.name}'s supported memory generation.`);
  }

  // Rule 2: module count vs available slots
  if (ram.modules !== undefined && motherboard.memorySlots !== undefined) {
    if (ram.modules > motherboard.memorySlots) {
      compatible = false;
      reasons.push(
        `${ram.name} comes as a ${ram.modules}-module kit, but ${motherboard.name} only has ${motherboard.memorySlots} memory slots.`
      );
    }
  }

  // Rule 3: total capacity vs motherboard's stated maximum
  if (motherboard.maxMemoryGb !== undefined && ram.capacityGb > motherboard.maxMemoryGb) {
    compatible = false;
    reasons.push(
      `${ram.name} totals ${ram.capacityGb}GB, which exceeds ${motherboard.name}'s maximum supported memory of ${motherboard.maxMemoryGb}GB.`
    );
  }

  return { compatible, confidence, reasons };
}
