import type {
  CompatibilityResult,
  CpuSocket,
  CpuSpec,
} from "@/types/hardware";

/**
 * Minimal "which platform is this socket" map. This is only used to give a
 * clearer explanation (Intel vs AMD) — the actual compatibility decision is
 * a plain string equality check on the socket, nothing fuzzier than that.
 */
const SOCKET_PLATFORM: Record<Exclude<CpuSocket, "unknown">, "Intel" | "AMD"> = {
  LGA1700: "Intel",
  LGA1200: "Intel",
  LGA1851: "Intel",
  AM4: "AMD",
  AM5: "AMD",
};

export interface NamedCpu extends CpuSpec {
  name: string;
}
export interface NamedMotherboard {
  name: string;
  socket: CpuSocket;
}

/**
 * Deterministic CPU <-> motherboard socket check.
 *
 * Rules (no AI involved, ever):
 *  - Both sockets known and equal            -> compatible, high confidence.
 *  - Both sockets known and different        -> INCOMPATIBLE, high confidence.
 *  - Either socket unknown                   -> cannot confirm, low confidence.
 */
export function checkCpuMotherboardCompatibility(
  cpu: NamedCpu,
  motherboard: NamedMotherboard
): CompatibilityResult {
  if (cpu.socket === "unknown" || motherboard.socket === "unknown") {
    return {
      compatible: false,
      confidence: "low",
      reasons: [
        `Could not determine the socket for ${
          cpu.socket === "unknown" ? cpu.name : motherboard.name
        }, so socket compatibility cannot be confirmed.`,
      ],
    };
  }

  if (cpu.socket === motherboard.socket) {
    return {
      compatible: true,
      confidence: "high",
      reasons: [
        `${cpu.name} and ${motherboard.name} both use the ${cpu.socket} socket.`,
      ],
    };
  }

  const cpuPlatform = SOCKET_PLATFORM[cpu.socket];
  const boardPlatform = SOCKET_PLATFORM[motherboard.socket];
  const platformNote =
    cpuPlatform !== boardPlatform
      ? ` (${cpuPlatform} CPU on a ${boardPlatform} motherboard)`
      : "";

  return {
    compatible: false,
    confidence: "high",
    reasons: [
      `${cpu.name} uses ${cpu.socket} while ${motherboard.name} uses ${motherboard.socket}${platformNote}.`,
    ],
  };
}
