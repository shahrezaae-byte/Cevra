import { randomUUID } from "crypto";
import type { Product } from "@/types/product";
import type { ShopCategory } from "@/types/shopping";

/**
 * Normalizes one SerpApi Google Shopping result into our Product shape.
 *
 * Guiding rule: if a field isn't present in the source data, it stays
 * `undefined`. We never infer a price, rating, or spec that the provider
 * didn't actually return — this includes shipping cost and any "was/now"
 * discount, both of which are only set when SerpApi explicitly returns them.
 */
export function normalizeSerpApiShoppingResult(
  raw: Record<string, unknown>,
  category: ShopCategory | undefined,
  retrievedAt: string
): Product {
  const title = typeof raw.title === "string" ? raw.title : "Unknown product";
  const price = parsePrice(raw.extracted_price ?? raw.price);
  const currency = inferCurrencyFromPriceString(raw.price);

  return {
    id: typeof raw.product_id === "string" ? raw.product_id : randomUUID(),
    name: title,
    brand: extractBrand(title),
    category: category ?? "other", // caller should always supply a known category in practice
    price,
    currency,
    originalPrice: parsePrice(raw.extracted_old_price ?? raw.old_price),
    shippingCost: parseShippingCost(raw.extracted_shipping ?? raw.shipping),
    retailer: typeof raw.source === "string" ? raw.source : undefined,
    url: typeof raw.product_link === "string" ? raw.product_link : undefined,
    imageUrl: typeof raw.thumbnail === "string" ? raw.thumbnail : undefined,
    availability: inferAvailability(raw),
    rawSpecifications: extractRawSpecifications(raw),
    source: "SerpApi (Google Shopping)",
    retrievedAt,
  };
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

/**
 * Shipping is only ever set to a real number when the source is explicit
 * about it — either an already-extracted numeric value, or a string we can
 * confidently read as "free" or a concrete dollar amount. Anything vague
 * ("calculated at checkout", missing entirely) stays `undefined` (unknown),
 * never defaulted to 0.
 */
function parseShippingCost(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (/free/i.test(value)) return 0;
    const match = value.match(/[\d.]+/);
    if (match) {
      const parsed = Number.parseFloat(match[0]);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

function inferCurrencyFromPriceString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.includes("$")) return "USD"; // SerpApi doesn't always give an ISO code; best-effort only
  return undefined;
}

function inferAvailability(raw: Record<string, unknown>): Product["availability"] {
  if (typeof raw.availability === "string") {
    const v = raw.availability.toLowerCase();
    if (v.includes("out of stock")) return "out_of_stock";
    if (v.includes("in stock")) return "in_stock";
  }
  return "unknown";
}

function extractBrand(title: string): string | undefined {
  const knownBrands = [
    "Intel",
    "AMD",
    "NVIDIA",
    "ASUS",
    "MSI",
    "Gigabyte",
    "ASRock",
    "Corsair",
    "G.Skill",
    "Kingston",
    "Crucial",
    "EVGA",
    "Seasonic",
    "Western Digital",
    "Samsung",
    "Apple",
    "Sony",
    "Bose",
    "Dell",
    "Lenovo",
    "HP",
    "Logitech",
  ];
  const found = knownBrands.find((b) => title.toLowerCase().includes(b.toLowerCase()));
  return found;
}

function extractRawSpecifications(
  raw: Record<string, unknown>
): Record<string, string> | undefined {
  if (!raw.extensions || !Array.isArray(raw.extensions)) return undefined;
  const entries = raw.extensions.filter((e): e is string => typeof e === "string");
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries.map((e, i) => [`note_${i}`, e]));
}
