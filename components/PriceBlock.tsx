import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { formatMoney } from "@/components/format";

export function PriceBlock({
  currency,
  effectivePrice,
}: {
  currency?: string;
  effectivePrice: EffectivePriceBreakdown;
}) {
  const { itemPrice, shippingCost, shippingVerified, effectivePrice: total, verifiedSavings, discountVerified } =
    effectivePrice;

  if (total === undefined) {
    return (
      <div>
        <p className="mb-1 text-sm text-ink-muted">Effective price</p>
        <p className="font-serif text-4xl text-ink-muted">Price unverified</p>
        <p className="mt-2 text-sm text-ink-muted">We couldn&apos;t verify a current price for this listing.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm text-ink-muted">Effective price</p>
      <p className="tabular font-serif text-6xl leading-none text-ink">{formatMoney(total, currency)}</p>
      <p className="tabular mt-3 text-sm text-ink-muted">
        {formatMoney(itemPrice, currency)} product{" + "}
        {shippingVerified ? `${formatMoney(shippingCost, currency)} shipping` : "shipping unverified"}
        {" = "}
        {formatMoney(total, currency)} effective price
      </p>
      {discountVerified && (
        <p className="tabular mt-1 text-sm text-decision-buy">
          Includes {formatMoney(verifiedSavings, currency)} in verified savings off list price.
        </p>
      )}
    </div>
  );
}
