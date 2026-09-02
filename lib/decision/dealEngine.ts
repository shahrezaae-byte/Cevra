import type { Product } from "@/types/product";
import type { CompatibilityIssue } from "@/types/recommendation";

/**
 * Effective price = item price + shipping + mandatory fees.
 *
 * NOTE on discounts: we track `verifiedSavings` (originalPrice - price,
 * only when the retailer explicitly published both figures) purely as
 * informational context shown to the user ("this is $50 off its list
 * price"). We deliberately do NOT subtract it again from `effectivePrice`
 * — `price` is already the amount the user would actually pay, so
 * subtracting the discount a second time would double-count it. We never
 * apply an unverified coupon/promo discount to the price; if we can't
 * verify a discount, it's treated as none.
 */
export interface EffectivePriceBreakdown {
  itemPrice?: number;
  shippingCost: number;
  shippingVerified: boolean;
  mandatoryFees: number;
  verifiedSavings: number;
  discountVerified: boolean;
  /** undefined only when itemPrice itself is unknown. */
  effectivePrice?: number;
}

export function calculateEffectivePrice(
  product: Product,
  mandatoryFees = 0
): EffectivePriceBreakdown {
  const itemPrice = product.price;
  const shippingVerified = product.shippingCost !== undefined;
  const shippingCost = product.shippingCost ?? 0;

  const discountVerified =
    product.originalPrice !== undefined &&
    itemPrice !== undefined &&
    product.originalPrice > itemPrice;
  const verifiedSavings = discountVerified ? product.originalPrice! - itemPrice! : 0;

  const effectivePrice = itemPrice === undefined ? undefined : itemPrice + shippingCost + mandatoryFees;

  return {
    itemPrice,
    shippingCost,
    shippingVerified,
    mandatoryFees,
    verifiedSavings,
    discountVerified,
    effectivePrice,
  };
}

/**
 * MVP deal-score heuristics. Like the PC-hardware scoring in
 * `lib/decision/scoring.ts`, these weights are a reasonable starting point
 * for ranking already-viable products against each other — NOT a claim of
 * scientific/statistical accuracy. Every subscore is 0-100.
 *
 * Hard compatibility failures do not just lower this score — they
 * eliminate the product entirely (`eliminated: true`), matching the rule
 * that a deterministic incompatibility can never be argued around.
 */
export const DEAL_SCORE_WEIGHTS = {
  value: 0.35,
  compatibility: 0.25,
  availability: 0.15,
  meetsRequirements: 0.15,
  discount: 0.1,
} as const;

export interface DealScoreInput {
  product: Product;
  effectivePrice: EffectivePriceBreakdown;
  /** All compatibility issues from the run; only ones involving this product's id are used. */
  compatibilityIssues: CompatibilityIssue[];
  /** Median effective price among the comparable candidates, for relative value scoring. */
  comparableMedianEffectivePrice?: number;
  /** Whether this product's effective price fits the user's stated budget, if any was given. */
  meetsBudget?: boolean;
}

export interface DealScoreResult {
  productId: string;
  eliminated: boolean;
  eliminationReason?: string;
  total: number;
  breakdown: {
    value: number;
    compatibility: number;
    availability: number;
    meetsRequirements: number;
    discount: number;
  };
}

export function calculateDealScore(input: DealScoreInput): DealScoreResult {
  const relevantIssues = input.compatibilityIssues.filter((issue) =>
    issue.involving.includes(input.product.id)
  );
  const hardFailure = relevantIssues.find(
    (issue) => !issue.result.compatible && issue.result.confidence === "high"
  );

  if (hardFailure) {
    return {
      productId: input.product.id,
      eliminated: true,
      eliminationReason: hardFailure.result.reasons.join(" "),
      total: 0,
      breakdown: { value: 0, compatibility: 0, availability: 0, meetsRequirements: 0, discount: 0 },
    };
  }

  const compatibility = scoreCompatibility(relevantIssues);
  const value = scoreValue(input.effectivePrice.effectivePrice, input.comparableMedianEffectivePrice);
  const availability = scoreAvailability(input.product.availability);
  const meetsRequirements = scoreMeetsRequirements(input.meetsBudget);
  const discount = input.effectivePrice.discountVerified ? 80 : 50;

  const total =
    value * DEAL_SCORE_WEIGHTS.value +
    compatibility * DEAL_SCORE_WEIGHTS.compatibility +
    availability * DEAL_SCORE_WEIGHTS.availability +
    meetsRequirements * DEAL_SCORE_WEIGHTS.meetsRequirements +
    discount * DEAL_SCORE_WEIGHTS.discount;

  return {
    productId: input.product.id,
    eliminated: false,
    total: Math.round(total * 100) / 100,
    breakdown: { value, compatibility, availability, meetsRequirements, discount },
  };
}

function scoreCompatibility(relevantIssues: CompatibilityIssue[]): number {
  if (relevantIssues.length === 0) return 100; // nothing checked against this product failed
  if (relevantIssues.some((i) => !i.result.compatible)) return 40; // low/medium-confidence concern only (high-confidence already eliminated above)
  return 100;
}

function scoreValue(effectivePrice?: number, comparableMedian?: number): number {
  if (effectivePrice === undefined || comparableMedian === undefined || comparableMedian === 0) {
    return 50; // neutral — can't assess relative value without a comparison point
  }
  const ratio = effectivePrice / comparableMedian;
  const raw = 100 - (ratio - 1) * 100;
  return Math.max(0, Math.min(100, raw));
}

function scoreAvailability(availability: Product["availability"]): number {
  if (availability === "in_stock") return 100;
  if (availability === "out_of_stock") return 0;
  return 50; // unknown
}

function scoreMeetsRequirements(meetsBudget?: boolean): number {
  if (meetsBudget === undefined) return 50; // no budget was stated — neutral, not a penalty
  return meetsBudget ? 100 : 20;
}
