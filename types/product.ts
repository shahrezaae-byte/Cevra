import type { HardwareSpecification } from "./hardware";
import type { ShopCategory } from "./shopping";

/**
 * A normalized product record. This is the shape every research provider's
 * output gets mapped into before anything downstream (compatibility engine,
 * Claude, decision engine) touches it.
 *
 * Anything the source didn't tell us is left `undefined` — never guessed.
 */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category: ShopCategory;
  price?: number;
  currency?: string;
  /**
   * A retailer-published "was" / list price, only set when the source
   * explicitly provides one. Used solely to surface a *verified* discount
   * (originalPrice - price) — never inferred or estimated.
   */
  originalPrice?: number;
  /**
   * Shipping cost in the same currency as `price`. `undefined` means the
   * source didn't tell us — that is NOT the same as confirmed free
   * shipping, which is `0`. Downstream code must keep that distinction.
   */
  shippingCost?: number;
  retailer?: string;
  url?: string;
  imageUrl?: string;
  availability?: "in_stock" | "out_of_stock" | "unknown";
  specifications?: HardwareSpecification;
  /** Free-text specs we couldn't map to a known field, kept for transparency. */
  rawSpecifications?: Record<string, string>;
  source: string;
  retrievedAt: string; // ISO timestamp
}

export interface ReviewSummary {
  productId: string;
  averageRating?: number;
  reviewCount?: number;
  summary?: string;
  source: string;
  retrievedAt: string;
}

