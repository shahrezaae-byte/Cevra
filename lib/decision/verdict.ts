import type { CompatibilityIssue, ProductScore, Verdict } from "@/types/recommendation";

export interface VerdictInput {
  compatibilityIssues: CompatibilityIssue[];
  bestScore?: ProductScore;
  /** Claude's own verdict from comparing the options qualitatively. */
  aiVerdict?: Verdict;
  aiConfidence?: number;
}

/**
 * Deterministic verdict rules. Claude's opinion is only used to choose
 * between BUY and WAIT when nothing forces AVOID — it can never override a
 * hard compatibility failure.
 */
export function getVerdict(input: VerdictInput): Verdict {
  const hasHardIncompatibility = input.compatibilityIssues.some(
    (issue) => !issue.result.compatible && issue.result.confidence === "high"
  );
  if (hasHardIncompatibility) {
    return "AVOID";
  }

  const hasUnresolvedUncertainty = input.compatibilityIssues.some(
    (issue) => !issue.result.compatible && issue.result.confidence !== "high"
  );

  if (input.bestScore !== undefined && input.bestScore.total < 40) {
    return "AVOID";
  }

  if (hasUnresolvedUncertainty) {
    return "WAIT";
  }

  if (input.aiVerdict === "AVOID") {
    // Claude flagged something the deterministic layer didn't catch
    // (e.g. a known bad product batch). We trust AVOID/WAIT downgrades
    // from Claude since they're conservative, but never let it upgrade
    // past a compatibility-driven AVOID/WAIT decided above.
    return "AVOID";
  }

  if (input.aiVerdict === "WAIT") {
    return "WAIT";
  }

  if (input.bestScore !== undefined && input.bestScore.total < 60) {
    return "WAIT";
  }

  return "BUY";
}
