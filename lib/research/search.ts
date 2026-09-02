import type { Product } from "@/types/product";
import type { SearchProvider } from "@/types/research";
import type { ReviewSummary } from "@/types/product";
import type { ShopCategory } from "@/types/shopping";
import { normalizeSerpApiShoppingResult } from "@/lib/research/products";

/**
 * Concrete SearchProvider backed by SerpApi's Google Shopping engine.
 *
 * This is intentionally the ONLY provider wired up for the MVP, chosen
 * because it needs a single API key and returns shopping results directly.
 * Swapping to a different backend means implementing this same
 * `SearchProvider` interface — nothing else in the app depends on SerpApi.
 */
export class SerpApiSearchProvider implements SearchProvider {
  readonly name = "SerpApi (Google Shopping)";

  constructor(private readonly apiKey: string) {}

  async searchProducts(query: string, category?: ShopCategory): Promise<Product[]> {
    const q = category && category !== "other" ? `${query} ${category}` : query;
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", q);
    url.searchParams.set("api_key", this.apiKey);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Search provider request failed with status ${res.status}`);
    }
    const data = (await res.json()) as {
      shopping_results?: Record<string, unknown>[];
    };

    const results = data.shopping_results ?? [];
    const retrievedAt = new Date().toISOString();
    return results.map((r) => normalizeSerpApiShoppingResult(r, category, retrievedAt));
  }

  async searchReviews(productName: string): Promise<ReviewSummary[]> {
    // MVP scope: SerpApi's shopping engine surfaces a rating/review count
    // alongside the product itself (handled in normalization). A dedicated
    // review search is a follow-up, not part of this MVP.
    void productName;
    return [];
  }

  async searchPriceInformation(productName: string): Promise<Partial<Product>[]> {
    const products = await this.searchProducts(productName);
    return products.map((p) => ({ price: p.price, currency: p.currency, retailer: p.retailer, url: p.url }));
  }
}

export interface ProviderResolution {
  provider: SearchProvider | null;
  configurationError?: string;
}

/**
 * The single place that decides whether live research is available.
 * NEVER falls back to fabricated data — if there's no key, callers get an
 * explicit configuration error to surface to the user.
 */
export function resolveSearchProvider(): ProviderResolution {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) {
    return {
      provider: null,
      configurationError:
        "Live product research is unavailable because SEARCH_API_KEY is not configured.",
    };
  }
  return { provider: new SerpApiSearchProvider(apiKey) };
}
