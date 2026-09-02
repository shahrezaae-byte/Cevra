import type { CompatibilityIssue } from "@/types/recommendation";
import type { Product } from "@/types/product";

/**
 * Renders the "X × Y — INCOMPATIBLE" moment for a pairwise deterministic
 * check. The status word is derived strictly from the real result: only a
 * HIGH-confidence failure is ever shown as INCOMPATIBLE. A failure we
 * can't confirm (low/medium confidence — e.g. an unrecognized part) is
 * shown as UNKNOWN rather than overclaiming a verdict the engine didn't
 * actually reach.
 *
 * `issue.involving` sometimes contains a raw product id rather than a
 * human name (e.g. a RAM-vs-motherboard check identifies the RAM by id).
 * `products` — the real Product records already present elsewhere in the
 * response — lets this resolve those ids to actual names for display; it
 * never invents a name for anything it can't find.
 */
export function CompatibilityShowdown({ issue, products = [] }: { issue: CompatibilityIssue; products?: Product[] }) {
  const { compatible, confidence, reasons } = issue.result;
  const status = compatible ? "COMPATIBLE" : confidence === "high" ? "INCOMPATIBLE" : "UNKNOWN";
  const color =
    status === "COMPATIBLE"
      ? "text-decision-buy"
      : status === "INCOMPATIBLE"
        ? "text-decision-avoid"
        : "text-decision-unknown";
  const labels = issue.involving.map((raw) => products.find((p) => p.id === raw)?.name ?? raw);

  return (
    <div className="rounded border border-hairline bg-surface p-8">
      <div className="flex flex-wrap items-center justify-center gap-3 text-center">
        {labels.map((part, i) => (
          <span key={part} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden className="text-ink-muted">
                ×
              </span>
            )}
            <span className="font-medium">{part}</span>
          </span>
        ))}
      </div>
      <p className={`mt-5 text-center font-sans text-2xl font-semibold tracking-tight ${color}`}>{status}</p>
      <p className="mx-auto mt-3 max-w-md text-center text-sm text-ink-muted leading-relaxed">
        {reasons.join(" ")}
      </p>
      <p className="mt-5 text-center text-xs text-ink-muted">
        Checked deterministically — this result cannot be overridden by AI.
      </p>
    </div>
  );
}
