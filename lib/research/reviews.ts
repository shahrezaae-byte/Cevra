import type { SearchProvider } from "@/types/research";
import type { ReviewSummary } from "@/types/product";

/**
 * Thin wrapper kept as its own module per the architecture spec, so review
 * fetching can grow independently of product search without callers caring
 * which provider is behind it.
 */
export async function fetchReviewsForProduct(
  provider: SearchProvider,
  productName: string
): Promise<ReviewSummary[]> {
  try {
    return await provider.searchReviews(productName);
  } catch {
    // Reviews are supplementary — a review-fetch failure should not take
    // down the whole analysis. Return nothing rather than fabricating.
    return [];
  }
}
