import type { Product } from "@/types/product";
import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { formatMoney } from "@/components/format";

export function ProductComparison({
  alternatives,
  winnerEffectivePrice,
  currency,
}: {
  alternatives: {
    product: Product;
    reason: string;
    effectivePrice?: EffectivePriceBreakdown;
  }[];
  winnerEffectivePrice?: number;
  currency?: string;
}) {
  if (alternatives.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-surface px-5 py-6">
        <p className="text-sm text-ink-muted">
          No alternatives were surfaced for this request.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div className="border-b border-hairline px-5 py-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Market comparison
            </p>

            <h3 className="mt-1 font-serif text-xl tracking-[-0.015em] text-ink">
              Other options CEVRA found
            </h3>
          </div>

          <span className="hidden text-xs text-ink-muted sm:block">
            Up to {Math.min(alternatives.length, 4)} alternatives
          </span>
        </div>
      </div>

      <ul className="divide-y divide-hairline">
        {alternatives.slice(0, 4).map(
          ({ product, reason, effectivePrice }, index) => {
            const price =
              effectivePrice?.effectivePrice ?? product.price;

            const displayCurrency = currency ?? product.currency;

            const diff =
              price !== undefined && winnerEffectivePrice !== undefined
                ? price - winnerEffectivePrice
                : undefined;

            const isCheaper = diff !== undefined && diff < 0;
            const isMoreExpensive = diff !== undefined && diff > 0;
            const isSamePrice = diff === 0;

            return (
              <li
                key={product.id}
                className="group px-5 py-5 transition-colors hover:bg-paper/30 sm:px-6"
              >
                <div className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline text-xs font-medium text-ink-muted">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="font-medium leading-snug text-ink">
                          {product.name}
                        </h4>

                        <p className="mt-1 text-xs text-ink-muted">
                          {product.retailer ?? "Source unknown"}
                        </p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="tabular text-lg font-semibold tracking-[-0.015em] text-ink">
                          {formatMoney(price, displayCurrency)}
                        </p>

                        {diff !== undefined && !isSamePrice && (
                          <p
                            className={`tabular mt-0.5 text-xs ${
                              isCheaper
                                ? "text-decision-buy"
                                : "text-ink-muted"
                            }`}
                          >
                            {isCheaper
                              ? `${formatMoney(
                                  Math.abs(diff),
                                  displayCurrency,
                                )} less`
                              : `${formatMoney(
                                  diff,
                                  displayCurrency,
                                )} more`}
                          </p>
                        )}

                        {isSamePrice && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            Same effective price
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-l-2 border-hairline pl-3">
                      <p className="text-sm leading-6 text-ink-muted">
                        {reason}
                      </p>
                    </div>

                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-ink"
                      >
                        View listing
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          },
        )}
      </ul>
    </div>
  );
}