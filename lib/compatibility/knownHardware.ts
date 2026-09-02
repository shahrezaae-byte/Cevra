import type { CpuSpec, MotherboardSpec } from "@/types/hardware";

/**
 * A small, hand-curated table of publicly documented specs for common
 * components. This exists ONLY so that when a user tells us hardware they
 * already own by name (e.g. "I have an i9-14900K"), we can run the
 * deterministic compatibility engine against real socket/generation data
 * instead of guessing or asking Claude to invent it.
 *
 * This is NOT a substitute for the research layer — it only covers a
 * handful of well-known parts. Anything not listed here resolves to
 * "unknown" fields, which the compatibility engine already handles safely
 * (low confidence, never a false "compatible: true").
 */
const KNOWN_CPUS: { match: RegExp; spec: CpuSpec }[] = [
  { match: /i9-14900k/i, spec: { socket: "LGA1700", tdpWatts: 253 } },
  { match: /i7-14700k/i, spec: { socket: "LGA1700", tdpWatts: 253 } },
  { match: /i5-14600k/i, spec: { socket: "LGA1700", tdpWatts: 181 } },
  { match: /i9-13900k/i, spec: { socket: "LGA1700", tdpWatts: 253 } },
  { match: /i5-13600k/i, spec: { socket: "LGA1700", tdpWatts: 181 } },
  { match: /ryzen 9 7950x/i, spec: { socket: "AM5", tdpWatts: 170 } },
  { match: /ryzen 7 7800x3d/i, spec: { socket: "AM5", tdpWatts: 120 } },
  { match: /ryzen 5 7600x/i, spec: { socket: "AM5", tdpWatts: 105 } },
  { match: /ryzen 9 5900x/i, spec: { socket: "AM4", tdpWatts: 105 } },
  { match: /ryzen 7 5800x3d/i, spec: { socket: "AM4", tdpWatts: 105 } },
  { match: /ryzen 5 5600x/i, spec: { socket: "AM4", tdpWatts: 65 } },
];

const KNOWN_MOTHERBOARDS: { match: RegExp; spec: MotherboardSpec }[] = [
  {
    match: /b550m-hdv/i,
    spec: { socket: "AM4", formFactor: "Micro-ATX", memoryGeneration: "DDR4", memorySlots: 4, maxMemoryGb: 128, pcieX16Slots: 1 },
  },
  {
    match: /b550/i,
    spec: { socket: "AM4", formFactor: "ATX", memoryGeneration: "DDR4", memorySlots: 4, maxMemoryGb: 128, pcieX16Slots: 1 },
  },
  {
    match: /x670e/i,
    spec: { socket: "AM5", formFactor: "ATX", memoryGeneration: "DDR5", memorySlots: 4, maxMemoryGb: 128, pcieX16Slots: 2 },
  },
  {
    match: /b650/i,
    spec: { socket: "AM5", formFactor: "ATX", memoryGeneration: "DDR5", memorySlots: 4, maxMemoryGb: 128, pcieX16Slots: 1 },
  },
  {
    match: /z790/i,
    spec: { socket: "LGA1700", formFactor: "ATX", memoryGeneration: "DDR5", memorySlots: 4, maxMemoryGb: 192, pcieX16Slots: 2 },
  },
  {
    match: /b760/i,
    spec: { socket: "LGA1700", formFactor: "ATX", memoryGeneration: "DDR5", memorySlots: 4, maxMemoryGb: 128, pcieX16Slots: 1 },
  },
];

export function resolveKnownCpuSpec(name: string): CpuSpec {
  const found = KNOWN_CPUS.find((entry) => entry.match.test(name));
  return found?.spec ?? { socket: "unknown" };
}

export function resolveKnownMotherboardSpec(name: string): MotherboardSpec {
  const found = KNOWN_MOTHERBOARDS.find((entry) => entry.match.test(name));
  return (
    found?.spec ?? {
      socket: "unknown",
      formFactor: "unknown",
      memoryGeneration: "unknown",
    }
  );
}
