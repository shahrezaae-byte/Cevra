import type { Product } from "@/types/product";
import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { formatMoney } from "@/components/format";

export function ProductComparison({
  alternatives,
  winnerEffectivePrice,
  currency,
}: {
  alternatives: { product: Product; reason: string; effectivePrice?: EffectivePriceBreakdown }[];
  /** The winning pick's effective price, for showing "+$30" style differences. Optional — the hardware-analyze flow doesn't have one. */
  winnerEffectivePrice?: number;
  currency?: string;
}) {
  if (alternatives.length === 0) {
    return <p className="text-sm text-ink-muted">No alternatives were surfaced for this request.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {alternatives.slice(0, 4).map(({ product, reason, effectivePrice }) => {
        const price = effectivePrice?.effectivePrice ?? product.price;
        const displayCurrency = currency ?? product.currency;
        const diff =
          price !== undefined && winnerEffectivePrice !== undefined ? price - winnerEffectivePrice : undefined;

        return (
          <li key={product.id} className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{product.name}</span>
              <span className="tabular shrink-0 text-sm">
                {formatMoney(price, displayCurrency)}
                {diff !== undefined && diff !== 0 && (
                  <span className="ml-2 text-ink-muted">
                    {diff > 0
                      ? `+${formatMoney(diff, displayCurrency)}`
                      : `-${formatMoney(Math.abs(diff), displayCurrency)}`}
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs text-ink-muted">{product.retailer ?? "Source unknown"}</p>
            <p className="text-sm leading-relaxed text-ink-muted">{reason}</p>
          </li>
        );
      })}
    </ul>
  );
}
