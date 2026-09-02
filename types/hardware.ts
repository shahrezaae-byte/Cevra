/**
 * Hardware domain types.
 *
 * These describe the *specification* shape for each supported hardware
 * category. Fields are optional almost everywhere because research data
 * is frequently incomplete — we never invent missing values, so "unknown"
 * has to be a legal state for nearly every field.
 */

export type HardwareCategory =
  | "cpu"
  | "motherboard"
  | "ram"
  | "gpu"
  | "psu"
  | "storage";

export type CpuSocket =
  | "LGA1700"
  | "LGA1200"
  | "LGA1851"
  | "AM4"
  | "AM5"
  | "unknown";

export type MemoryGeneration = "DDR3" | "DDR4" | "DDR5" | "unknown";

export type MotherboardFormFactor =
  | "ATX"
  | "Micro-ATX"
  | "Mini-ITX"
  | "E-ATX"
  | "unknown";

export interface CpuSpec {
  socket: CpuSocket;
  cores?: number;
  threads?: number;
  tdpWatts?: number;
  integratedGraphics?: boolean;
}

export interface MotherboardSpec {
  socket: CpuSocket;
  formFactor: MotherboardFormFactor;
  memoryGeneration: MemoryGeneration;
  memorySlots?: number;
  maxMemoryGb?: number;
  pcieX16Slots?: number;
}

export interface RamSpec {
  generation: MemoryGeneration;
  capacityGb: number;
  modules?: number;
  speedMhz?: number;
}

export interface GpuSpec {
  lengthMm?: number;
  tdpWatts?: number;
  recommendedPsuWatts?: number;
  powerConnectors?: string[]; // e.g. ["8-pin", "8-pin"] or ["16-pin"]
  interface?: "PCIe x16" | "unknown";
}

export interface PsuSpec {
  wattage: number;
  efficiencyRating?: string; // e.g. "80+ Gold"
  modular?: "full" | "semi" | "none" | "unknown";
  availableConnectors?: string[];
}

export interface StorageSpec {
  type?: "NVMe SSD" | "SATA SSD" | "HDD" | "unknown";
  capacityGb?: number;
  interface?: "PCIe4" | "PCIe3" | "SATA" | "unknown";
}

/** Union of all component specs, discriminated by category on the Product. */
export type HardwareSpecification =
  | ({ category: "cpu" } & CpuSpec)
  | ({ category: "motherboard" } & MotherboardSpec)
  | ({ category: "ram" } & RamSpec)
  | ({ category: "gpu" } & GpuSpec)
  | ({ category: "psu" } & PsuSpec)
  | ({ category: "storage" } & StorageSpec);

/** Standard shape returned by every deterministic compatibility check. */
export interface CompatibilityResult {
  compatible: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}
