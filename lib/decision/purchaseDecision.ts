import type { DealScoreResult } from "@/lib/decision/dealEngine";

export type PurchaseDecision = "BUY" | "WAIT" | "SKIP" | "UNKNOWN";

export interface PurchaseDecisionInput {
  /** True when every researched candidate was eliminated (incompatible/unusable). */
  allEliminated: boolean;
  bestDealScore?: DealScoreResult;
  /** Whether the best candidate's effective price fits the user's stated budget, if any. */
  meetsBudget?: boolean;
  discountVerified: boolean;
  /**
   * Whether we actually have more than one candidate to compare against —
   * without that, we can't credibly say a price "isn't attractive" (WAIT)
   * versus just not knowing. Use UNKNOWN rather than guessing.
   */
  hasComparableAlternatives: boolean;
}

const STRONG_DEAL_THRESHOLD = 70;
const POOR_DEAL_THRESHOLD = 40;

/**
 * MVP purchase-decision heuristic — documented, not "scientifically
 * proven". A hard compatibility failure or a clearly unusable result
 * always resolves to SKIP; anything we don't have enough comparable data
 * to judge resolves to UNKNOWN rather than a confident-sounding guess.
 */
export function getPurchaseDecision(input: PurchaseDecisionInput): PurchaseDecision {
  if (input.allEliminated) return "SKIP";
  if (!input.bestDealScore) return "UNKNOWN";
  if (input.meetsBudget === false) return "SKIP";
  if (input.bestDealScore.total < POOR_DEAL_THRESHOLD) return "SKIP";

  if (!input.hasComparableAlternatives) {
    // We have one usable candidate and no market comparison — we can say
    // it meets requirements, but not confidently that it's a good *deal*.
    return "UNKNOWN";
  }

  if (input.bestDealScore.total >= STRONG_DEAL_THRESHOLD || input.discountVerified) {
    return "BUY";
  }

  return "WAIT";
}
