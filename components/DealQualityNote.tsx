import type { Decision } from "@/components/DecisionBadge";

const QUALITY_LABEL: Partial<Record<Decision, string>> = {
  BUY: "Strong deal",
  WAIT: "Fair deal",
  SKIP: "Weak deal",
  AVOID: "Blocked",
};

/**
 * Deliberately does NOT show a numeric score. The pipeline's internal deal
 * score isn't part of the API response, and even if it were, a single
 * number invites more confidence than the underlying comparison actually
 * supports. This shows only what's verifiably true: whether we had enough
 * comparable listings to judge quality at all, and — if so — a qualitative
 * read derived from the real decision already returned by the API.
 */
export function DealQualityNote({
  decision,
  productsConsidered,
  researchAvailable,
}: {
  decision: Decision;
  productsConsidered: number;
  researchAvailable: boolean;
}) {
  const hasComparison = researchAvailable && productsConsidered > 1;

  return (
    <div>
      {hasComparison ? (
        <>
          <p className="font-serif text-3xl text-ink">{QUALITY_LABEL[decision] ?? "Unclear"}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Based on a verified price comparison across {productsConsidered} researched listings.
          </p>
        </>
      ) : (
        <>
          <p className="font-serif text-3xl text-ink-muted">Unknown</p>
          <p className="mt-1 text-sm text-ink-muted">Not enough verified market data to score this deal.</p>
        </>
      )}
    </div>
  );
}
