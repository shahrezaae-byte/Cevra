import type { HardwareCategory } from "./hardware";
import type { ShopCategory } from "./shopping";
import type { Product, ReviewSummary } from "./product";

/**
 * Structured requirements extracted from the user's natural-language
 * request by Claude. Everything but the raw request text is optional —
 * the extraction step should never fabricate a budget or category the
 * user didn't imply.
 */
export interface PurchaseRequirements {
  rawRequest: string;
  category?: HardwareCategory;
  budget?: number;
  currency?: string;
  useCase?: string;
  capacity?: string;
  /** Components the user says they already own, for compatibility checks. */
  existingComponents?: ExistingComponent[];
  /** Follow-up questions Claude thinks we need answered before researching. */
  missingInformation?: string[];
}

export interface ExistingComponent {
  category: HardwareCategory;
  name: string;
}

export type ResearchAvailability =
  | { status: "available" }
  | { status: "unavailable"; reason: string };

export interface ResearchResult {
  availability: ResearchAvailability;
  products: Product[];
  reviews: ReviewSummary[];
}

/** Contract every search backend (SerpAPI, Bing, etc.) must implement. */
export interface SearchProvider {
  readonly name: string;
  searchProducts(query: string, category?: ShopCategory): Promise<Product[]>;
  searchReviews(productName: string): Promise<ReviewSummary[]>;
  searchPriceInformation(productName: string): Promise<Partial<Product>[]>;
}
