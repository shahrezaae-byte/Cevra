import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { formatMoney } from "@/components/format";

export function PriceBlock({
  currency,
  effectivePrice,
}: {
  currency?: string;
  effectivePrice: EffectivePriceBreakdown;
}) {
  const {
    itemPrice,
    shippingCost,
    shippingVerified,
    effectivePrice: total,
    verifiedSavings,
    discountVerified,
  } = effectivePrice;

  if (total === undefined) {
    return (
      <div className="border-t border-hairline pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Effective price
          </p>

          <span className="rounded-full border border-decision-unknown/25 bg-decision-unknown-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-decision-unknown">
            Unverified
          </span>
        </div>

        <p className="mt-3 font-serif text-4xl leading-none tracking-[-0.025em] text-ink-muted">
          Price unavailable
        </p>

        <p className="mt-3 max-w-md text-sm leading-6 text-ink-muted">
          We couldn&apos;t verify a current price for this listing, so CEVRA
          won&apos;t pretend it knows the deal.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-hairline pt-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Effective price
        </p>

        {shippingVerified ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-decision-buy">
            Price verified
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-decision-wait">
            Shipping unverified
          </span>
        )}
      </div>

      <p className="tabular mt-3 font-serif text-5xl leading-none tracking-[-0.035em] text-ink sm:text-6xl">
        {formatMoney(total, currency)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        <span className="tabular">
          {formatMoney(itemPrice, currency)} product
        </span>

        <span aria-hidden="true" className="text-hairline">
          +
        </span>

        <span className="tabular">
          {shippingVerified
            ? `${formatMoney(shippingCost, currency)} shipping`
            : "shipping unverified"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-hairline text-[9px]"
        >
          =
        </span>

        <span>
          Effective price:{" "}
          <strong className="tabular font-medium text-ink">
            {formatMoney(total, currency)}
          </strong>
        </span>
      </div>

      {discountVerified && verifiedSavings !== undefined && (
        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-decision-buy/20 bg-decision-buy-soft px-3 py-2">
          <span
            aria-hidden="true"
            className="text-sm text-decision-buy"
          >
            ↓
          </span>

          <p className="tabular text-xs font-medium text-decision-buy">
            {formatMoney(verifiedSavings, currency)} verified savings
          </p>
        </div>
      )}
    </div>
  );
}