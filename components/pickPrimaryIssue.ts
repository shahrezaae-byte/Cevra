import type { CompatibilityIssue } from "@/types/recommendation";

/**
 * Picks the one pairwise compatibility issue worth showing as a big "A × B"
 * moment: the one tied to the focus product (the recommendation/best
 * choice), or — if there isn't one (e.g. an existing-components conflict
 * caught before any product was even considered) — the first pairwise
 * check. Everything else is still returned, just meant for a plain list.
 */
export function pickPrimaryIssue(
  issues: CompatibilityIssue[],
  focusProductId?: string
): { primary?: CompatibilityIssue; rest: CompatibilityIssue[] } {
  if (issues.length === 0) return { rest: [] };

  const target = focusProductId
    ? issues.find((issue) => issue.involving.includes(focusProductId))
    : issues.find((issue) => issue.involving.length === 2);

  if (!target) return { rest: issues };
  return { primary: target, rest: issues.filter((i) => i !== target) };
}
