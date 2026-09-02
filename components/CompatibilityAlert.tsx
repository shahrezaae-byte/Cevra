import type { CompatibilityIssue } from "@/types/recommendation";
import type { Product } from "@/types/product";

function StatusGlyph({ compatible, confidence }: { compatible: boolean; confidence: "high" | "medium" | "low" }) {
  const solid = compatible || confidence === "high";
  const color = compatible ? "text-decision-buy" : confidence === "high" ? "text-decision-avoid" : "text-decision-unknown";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className={`mt-1.5 shrink-0 ${color}`}>
      {solid ? (
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      ) : (
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
      )}
    </svg>
  );
}

/** `products` resolves any raw product ids in `issue.involving` to real names; falls back to the raw string if not found. */
export function CompatibilityAlert({
  issues,
  products = [],
}: {
  issues: CompatibilityIssue[];
  products?: Product[];
}) {
  if (issues.length === 0) {
    return <p className="text-sm text-ink-muted">No compatibility checks were run against this request.</p>;
  }

  return (
    <ul className="flex flex-col gap-5">
      {issues.map((issue, i) => {
        const { compatible, confidence, reasons } = issue.result;
        const label = compatible ? "Compatible" : confidence === "high" ? "Incompatible" : "Unconfirmed";
        const labelColor = compatible
          ? "text-decision-buy"
          : confidence === "high"
            ? "text-decision-avoid"
            : "text-decision-unknown";
        const names = issue.involving.map((raw) => products.find((p) => p.id === raw)?.name ?? raw);

        return (
          <li key={i} className="flex gap-3">
            <StatusGlyph compatible={compatible} confidence={confidence} />
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{names.join(" + ")}</span>
                <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">{reasons.join(" ")}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
