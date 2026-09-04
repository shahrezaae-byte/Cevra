import type { CompatibilityIssue } from "@/types/recommendation";
import type { Product } from "@/types/product";

function StatusGlyph({
  compatible,
  confidence,
}: {
  compatible: boolean;
  confidence: "high" | "medium" | "low";
}) {
  const solid = compatible || confidence === "high";

  const color = compatible
    ? "text-decision-buy"
    : confidence === "high"
      ? "text-decision-avoid"
      : "text-decision-unknown";

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      className={`mt-0.5 shrink-0 ${color}`}
    >
      {solid ? (
        <>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          {compatible ? (
            <path
              d="M7.5 12.5l3 3 6-6.5"
              fill="none"
              stroke="var(--paper)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M8.5 8.5l7 7M15.5 8.5l-7 7"
              fill="none"
              stroke="var(--paper)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </>
      ) : (
        <>
          <circle
            cx="12"
            cy="12"
            r="9.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="2.5 2.5"
          />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="11"
            fill="currentColor"
          >
            ?
          </text>
        </>
      )}
    </svg>
  );
}

/**
 * Displays deterministic compatibility findings.
 *
 * `products` resolves raw product ids in `issue.involving` to product names.
 * The compatibility engine remains authoritative; this component only presents
 * its result.
 */
export function CompatibilityAlert({
  issues,
  products = [],
}: {
  issues: CompatibilityIssue[];
  products?: Product[];
}) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-surface px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-decision-unknown" />

          <div>
            <p className="text-sm font-medium text-ink">
              No compatibility checks were run
            </p>

            <p className="mt-1 text-xs leading-5 text-ink-muted">
              There was not enough compatibility information in this request
              to perform a check.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div className="border-b border-hairline px-5 py-4 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          Compatibility check
        </p>

        <h3 className="mt-1 font-serif text-xl tracking-[-0.015em] text-ink">
          Can these work together?
        </h3>
      </div>

      <ul className="divide-y divide-hairline">
        {issues.map((issue, i) => {
          const { compatible, confidence, reasons } = issue.result;

          const label = compatible
            ? "Compatible"
            : confidence === "high"
              ? "Incompatible"
              : "Unconfirmed";

          const labelColor = compatible
            ? "text-decision-buy"
            : confidence === "high"
              ? "text-decision-avoid"
              : "text-decision-unknown";

          const names = issue.involving.map(
            (raw) =>
              products.find((product) => product.id === raw)?.name ?? raw,
          );

          return (
            <li key={i} className="px-5 py-5 sm:px-6">
              <div className="flex gap-4">
                <StatusGlyph
                  compatible={compatible}
                  confidence={confidence}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium leading-snug text-ink">
                      {names.join(" + ")}
                    </p>

                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${labelColor}`}
                    >
                      {label}
                    </span>
                  </div>

                  {reasons.length > 0 && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                      {reasons.join(" ")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}