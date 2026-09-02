import type { Product, ReviewSummary } from "@/types/product";
import type { CompatibilityIssue, ProductScore } from "@/types/recommendation";

/**
 * MVP scoring heuristics.
 *
 * These weights are NOT scientifically derived — they're a reasonable
 * starting point for ranking already-compatible products against each
 * other, documented here so nobody mistakes them for a rigorous model.
 * Every subscore is 0-100; the total is a weighted average.
 */
export const SCORE_WEIGHTS = {
  compatibility: 0.35,
  value: 0.2,
  performance: 0.15,
  reliability: 0.1,
  reviews: 0.1,
  availability: 0.1,
} as const;

export interface ScoringInput {
  product: Product;
  compatibilityIssues: CompatibilityIssue[];
  review?: ReviewSummary;
  /** Median price of comparable products in this batch, for a relative value score. */
  comparableMedianPrice?: number;
}

function scoreCompatibility(input: ScoringInput): number {
  const relevant = input.compatibilityIssues.filter((issue) =>
    issue.involving.includes(input.product.id)
  );
  if (relevant.length === 0) return 100; // nothing checked against this product failed
  if (relevant.some((i) => !i.result.compatible && i.result.confidence === "high")) {
    return 0;
  }
  if (relevant.some((i) => !i.result.compatible)) return 40; // low/medium-confidence concern
  return 100;
}

function scoreValue(input: ScoringInput): number {
  const { product, comparableMedianPrice } = input;
  if (product.price === undefined || comparableMedianPrice === undefined || comparableMedianPrice === 0) {
    return 50; // neutral — we can't assess value without a price to compare against
  }
  const ratio = product.price / comparableMedianPrice;
  // Cheaper than the pack scores higher; clamp to [0, 100].
  const raw = 100 - (ratio - 1) * 100;
  return Math.max(0, Math.min(100, raw));
}

function scorePerformance(): number {
  // MVP: no benchmark database yet. Claude's qualitative comparison covers
  // this dimension in the final report; the numeric score stays neutral so
  // it doesn't silently dominate the ranking with a fabricated number.
  return 50;
}

function scoreReliability(product: Product): number {
  // Neutral placeholder until a real reliability/failure-rate data source
  // is integrated. Documented as a known MVP limitation.
  return product.availability === "in_stock" ? 55 : 50;
}

function scoreReviews(review?: ReviewSummary): number {
  if (!review || review.averageRating === undefined) return 50;
  // averageRating assumed to be on a 0-5 scale.
  return Math.max(0, Math.min(100, (review.averageRating / 5) * 100));
}

function scoreAvailability(product: Product): number {
  if (product.availability === "in_stock") return 100;
  if (product.availability === "out_of_stock") return 0;
  return 50; // unknown
}

export function calculateProductScore(input: ScoringInput): ProductScore {
  const breakdown = {
    compatibility: scoreCompatibility(input),
    value: scoreValue(input),
    performance: scorePerformance(),
    reliability: scoreReliability(input.product),
    reviews: scoreReviews(input.review),
    availability: scoreAvailability(input.product),
  };

  const total =
    breakdown.compatibility * SCORE_WEIGHTS.compatibility +
    breakdown.value * SCORE_WEIGHTS.value +
    breakdown.performance * SCORE_WEIGHTS.performance +
    breakdown.reliability * SCORE_WEIGHTS.reliability +
    breakdown.reviews * SCORE_WEIGHTS.reviews +
    breakdown.availability * SCORE_WEIGHTS.availability;

  return {
    productId: input.product.id,
    total: Math.round(total * 100) / 100,
    breakdown,
  };
}

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
