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
  effectivePrice?: EffectivePriceBreakdown;
}) {
  const hasEffectivePrice = effectivePrice?.effectivePrice !== undefined;
  const hasSavings =
    effectivePrice?.discountVerified &&
    effectivePrice.verifiedSavings !== undefined;

  return (
    <article
      className={[
        "group flex flex-col overflow-hidden rounded-2xl border bg-surface transition-all duration-200",
        emphasis
          ? "border-accent/50 shadow-[0_0_0_1px_rgba(142,168,255,0.08)]"
          : "border-hairline hover:border-ink-muted/40",
      ].join(" ")}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            {emphasis && (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                Best match
              </p>
            )}

            <h3 className="font-serif text-xl leading-snug tracking-[-0.015em] text-ink sm:text-2xl">
              {product.name}
            </h3>
          </div>

          <div className="shrink-0 text-right">
            <p className="tabular font-serif text-xl leading-none text-ink sm:text-2xl">
              {formatMoney(product.price, product.currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <span className="font-medium text-ink">
            {product.retailer ?? "Source unknown"}
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
                  : "text-decision-wait"
            }
          >
            {availabilityLabel(product.availability)}
          </span>
        </div>
      </div>

      {effectivePrice && (
        <div className="border-t border-hairline bg-paper/40 px-5 py-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-0">
            <div className="flex items-center justify-between gap-4 sm:block sm:border-r sm:border-hairline sm:pr-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                Shipping
              </p>

              <p className="tabular mt-1 text-sm text-ink sm:text-base">
                {effectivePrice.shippingVerified
                  ? formatMoney(
                      effectivePrice.shippingCost,
                      product.currency,
                    )
                  : "Unverified"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:block sm:border-r sm:border-hairline sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                Savings
              </p>

              <p
                className={`tabular mt-1 text-sm sm:text-base ${
                  hasSavings
                    ? "text-decision-buy"
                    : "text-ink-muted"
                }`}
              >
                {hasSavings
                  ? `−${formatMoney(
                      effectivePrice.verifiedSavings,
                      product.currency,
                    )}`
                  : "Not verified"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:block sm:pl-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                Effective price
              </p>

              <p className="tabular mt-1 text-base font-semibold text-ink sm:text-lg">
                {hasEffectivePrice
                  ? formatMoney(
                      effectivePrice.effectivePrice,
                      product.currency,
                    )
                  : "Unverified"}
              </p>
            </div>
          </div>
        </div>
      )}

      {product.url && (
        <div className="border-t border-hairline px-5 py-3 sm:px-6">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-ink"
          >
            View listing
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </a>
        </div>
      )}
    </article>
  );
}

function availabilityLabel(
  availability: Product["availability"],
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