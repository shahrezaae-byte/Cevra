import type { Product } from "@/types/product";
import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { ProductCard } from "@/components/ProductCard";

export function RecommendationCard({
  product,
  reason,
  effectivePrice,
}: {
  product: Product;
  reason: string;
  effectivePrice?: EffectivePriceBreakdown;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ProductCard product={product} emphasis effectivePrice={effectivePrice} />
      <p className="text-sm text-ink-muted leading-relaxed">{reason}</p>
    </div>
  );
}
