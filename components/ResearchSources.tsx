import type { Product } from "@/types/product";
import { formatMoney } from "@/components/format";

/**
 * Shows the actual researched listings behind a recommendation — retailer,
 * product, price, availability, URL, and when it was checked — so
 * verification is visible rather than asserted. Falls back to the plain
 * name/url source list only when no full Product records are available
 * (e.g. every candidate was eliminated before being surfaced).
 */
export function ResearchSources({
  products,
  fallbackSources,
}: {
  products: Product[];
  fallbackSources: { name: string; url?: string }[];
}) {
  if (products.length === 0 && fallbackSources.length === 0) return null;

  return (
    <details className="border-t border-hairline pt-6">
      <summary className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-ink">
        Research sources
      </summary>
      <div className="mt-4">
        {products.length > 0 ? (
          <ul className="flex flex-col divide-y divide-hairline">
            {products.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 py-3 text-sm first:pt-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="tabular text-ink-muted">{formatMoney(p.price, p.currency)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  <span>{p.retailer ?? "Retailer unknown"}</span>
                  <span aria-hidden>·</span>
                  <span>{availabilityLabel(p.availability)}</span>
                  <span aria-hidden>·</span>
                  <span>Checked {formatTimestamp(p.retrievedAt)}</span>
                  {p.url && (
                    <>
                      <span aria-hidden>·</span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline underline-offset-2 hover:no-underline"
                      >
                        View listing
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-1">
            {fallbackSources.map((s, i) => (
              <li key={i} className="text-sm">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2 hover:no-underline"
                  >
                    {s.name}
                  </a>
                ) : (
                  <span className="text-ink-muted">{s.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function availabilityLabel(availability?: "in_stock" | "out_of_stock" | "unknown"): string {
  switch (availability) {
    case "in_stock":
      return "In stock";
    case "out_of_stock":
      return "Out of stock";
    default:
      return "Availability unverified";
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
