import type { Product } from "@/types/product";
import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { formatMoney } from "@/components/format";

export function ProductCard({
  product,
  emphasis = false,
  effectivePrice,
}: {
  product: Product;
  emphasis?: boolean;
  /** Optional — only the Shopping Buddy flow passes this. Renders shipping/savings/effective-price context when present. */
  effectivePrice?: EffectivePriceBreakdown;
}) {
  return (
    <div className={`flex flex-col gap-2 border p-4 ${emphasis ? "border-accent" : "border-hairline"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium leading-snug">{product.name}</span>
        <span className="tabular shrink-0 text-sm">{formatMoney(product.price, product.currency)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <span>{product.retailer ?? "Source unknown"}</span>
        <span aria-hidden>·</span>
        <span>{availabilityLabel(product.availability)}</span>
      </div>
      {effectivePrice && (
        <div className="tabular flex flex-col gap-0.5 border-t border-hairline pt-2 text-xs text-ink-muted">
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{effectivePrice.shippingVerified ? formatMoney(effectivePrice.shippingCost, product.currency) : "Unverified"}</span>
          </div>
          {effectivePrice.discountVerified && (
            <div className="flex items-center justify-between text-decision-buy">
              <span>Verified savings</span>
              <span>-{formatMoney(effectivePrice.verifiedSavings, product.currency)}</span>
            </div>
          )}
          {effectivePrice.effectivePrice !== undefined && (
            <div className="flex items-center justify-between font-medium text-ink">
              <span>Effective price</span>
              <span>{formatMoney(effectivePrice.effectivePrice, product.currency)}</span>
            </div>
          )}
        </div>
      )}
      {product.url ? (
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent underline underline-offset-2 hover:no-underline"
        >
          View listing
        </a>
      ) : null}
    </div>
  );
}

function availabilityLabel(availability: Product["availability"]): string {
  switch (availability) {
    case "in_stock":
      return "In stock";
    case "out_of_stock":
      return "Out of stock";
    default:
      return "Availability unverified";
  }
}
