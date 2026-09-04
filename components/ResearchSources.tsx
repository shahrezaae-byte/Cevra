import type { Product } from "@/types/product";
import { formatMoney } from "@/components/format";

export function ResearchSources({
  products,
  fallbackSources,
}: {
  products: Product[];
  fallbackSources: { name: string; url?: string }[];
}) {
  if (products.length === 0 && fallbackSources.length === 0) {
    return null;
  }

  return (
    <details className="group border-t border-hairline pt-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="font-medium">Research evidence</span>

        <span
          aria-hidden="true"
          className="text-lg leading-none transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>

      <div className="mt-5 overflow-hidden rounded-2xl border border-hairline bg-surface">
        {products.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {products.map((product) => (
              <li
                key={product.id}
                className="px-5 py-4 sm:px-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug text-ink">
                      {product.name}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                      <span>
                        {product.retailer ?? "Retailer unknown"}
                      </span>

                      <span aria-hidden="true" className="text-hairline">
                        ·
                      </span>

                      <span
                        className={
                          product.availability === "in_stock"
                            ? "text-decision-buy"
                            : product.availability === "out_of_stock"
                              ? "text-decision-avoid"
                              : "text-ink-muted"
                        }
                      >
                        {availabilityLabel(product.availability)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="tabular text-base font-medium text-ink">
                      {formatMoney(product.price, product.currency)}
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      Checked {formatTimestamp(product.retrievedAt)}
                    </p>
                  </div>
                </div>

                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-ink"
                  >
                    View original listing
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-hairline">
            {fallbackSources.map((source, index) => (
              <li key={index} className="px-5 py-3.5 sm:px-6">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-ink"
                  >
                    {source.name}
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="text-sm text-ink-muted">
                    {source.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-hairline bg-paper/40 px-5 py-3 sm:px-6">
          <p className="text-xs leading-5 text-ink-muted">
            These are the listings CEVRA used as evidence for its recommendation.
          </p>
        </div>
      </div>
    </details>
  );
}

function availabilityLabel(
  availability?: "in_stock" | "out_of_stock" | "unknown",
): string {
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
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}