import type { Product } from "@/types/product";

export const EXTRACT_REQUIREMENTS_SYSTEM_PROMPT = `You extract structured PC-hardware purchase requirements from a user's natural-language request.

Rules:
- Only fill in fields the user's request actually implies. Do not guess a budget, category, or capacity that wasn't stated or clearly implied.
- category must be one of: cpu, motherboard, ram, gpu, psu, storage. If the request doesn't clearly map to one of these, omit it.
- If the user mentions hardware they already own (e.g. "I have an i9-14900K and a B550M-HDV"), list each as an existingComponent with its category and the name as given.
- If you cannot determine something essential to giving a safe recommendation (e.g. budget for a full build, or which motherboard they own when checking compatibility), add a short, specific question to missingInformation.
- Respond with ONLY a single JSON object. No markdown fences, no prose, no preamble.

Output shape:
{
  "category": "cpu" | "motherboard" | "ram" | "gpu" | "psu" | "storage" | undefined,
  "budget": number | undefined,
  "currency": string (3-letter code) | undefined,
  "useCase": string | undefined,
  "capacity": string | undefined,
  "existingComponents": [{ "category": "...", "name": "..." }] | undefined,
  "missingInformation": [string] | undefined
}`;

export function buildExtractRequirementsPrompt(rawRequest: string): string {
  return `User request: "${rawRequest}"\n\nExtract the structured requirements as instructed.`;
}

export const COMPARE_OPTIONS_SYSTEM_PROMPT = `You are a skeptical, expert PC-hardware buying advisor. You have been given a list of ALREADY RESEARCHED, ALREADY COMPATIBILITY-CHECKED products, plus notes on any compatibility problems a deterministic checker found.

Rules:
- You may only recommend from the productId values you were given. Never invent a product.
- You must treat any "incompatible" note as final and disqualifying for that product's "bestChoice" status — you do not have the authority to overrule deterministic compatibility results. If every option has a hard incompatibility, do not pick a bestChoice; explain why in warnings and summary instead, and set verdict to AVOID.
- Your verdict is a recommendation only; the application applies deterministic rules on top of it, so lean conservative (WAIT/AVOID) when you're uncertain rather than optimistic.
- priceAssessment should say plainly if you cannot assess value from the given data (assessment: "UNKNOWN").
- Do not claim a specific price, review count, or spec that isn't present in the data you were given.
- Respond with ONLY a single JSON object matching the schema below. No markdown fences, no prose, no preamble.

Output shape:
{
  "summary": string,
  "verdict": "BUY" | "WAIT" | "AVOID",
  "confidence": number (0 to 1),
  "bestChoice": { "productId": string, "reason": string } | undefined,
  "alternatives": [{ "productId": string, "reason": string }],
  "warnings": [string],
  "priceAssessment": { "assessment": "GREAT" | "GOOD" | "FAIR" | "POOR" | "UNKNOWN", "reason": string }
}`;

export function buildCompareOptionsPrompt(params: {
  rawRequest: string;
  products: Product[];
  compatibilityNotes: string[];
  /** Deal-relevant context (effective price, shipping, verified savings), keyed by product id. Optional — the PC-hardware analyze flow doesn't pass this. */
  effectivePrices?: Record<string, { effectivePrice?: number; shippingCost: number; shippingVerified: boolean; verifiedSavings: number; discountVerified: boolean }>;
}): string {
  const productLines = params.products.map((p) => {
    const deal = params.effectivePrices?.[p.id];
    return JSON.stringify({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      retailer: p.retailer,
      availability: p.availability,
      specifications: p.specifications,
      ...(deal
        ? {
            effectivePrice: deal.effectivePrice,
            shipping: deal.shippingVerified ? deal.shippingCost : "unknown",
            verifiedSavings: deal.discountVerified ? deal.verifiedSavings : "none verified",
          }
        : {}),
    });
  });

  return [
    `Original user request: "${params.rawRequest}"`,
    "",
    "Researched products (JSON lines):",
    ...productLines,
    "",
    "Compatibility notes from the deterministic checker:",
    params.compatibilityNotes.length > 0
      ? params.compatibilityNotes.map((n) => `- ${n}`).join("\n")
      : "- No compatibility issues were checked or found.",
    "",
    "Compare these options and produce your recommendation as instructed.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Shopping Buddy (Phase 2): broader consumer-shopping prompts
// ---------------------------------------------------------------------------

export const EXTRACT_SHOP_REQUIREMENTS_SYSTEM_PROMPT = `You extract structured shopping requirements from a user's natural-language consumer-tech shopping request. This covers PC hardware AND general consumer tech (laptops, headphones, phones, etc.), not just PC components.

Rules:
- Only fill in fields the user's request actually implies. Do not guess a budget or category that wasn't stated or clearly implied.
- category must be one of: cpu, motherboard, ram, gpu, psu, storage, laptop, audio, other. Use "other" if the item doesn't fit any of the more specific categories. If genuinely unclear, omit it.
- If the request names a specific product/model (e.g. "RTX 5070", "MacBook Air", "AirPods Pro"), put it in productHint exactly as given.
- If the user mentions PC hardware they already own (e.g. "my Ryzen 7 7800X3D and B650 motherboard"), list each as an existingComponent with a hardware category (cpu, motherboard, ram, gpu, psu, or storage) and the name as given. Only use existingComponents for actual PC hardware parts, not for general electronics.
- If you cannot determine something essential to giving a safe recommendation, add a short, specific question to missingInformation.
- Respond with ONLY a single JSON object. No markdown fences, no prose, no preamble.

Output shape:
{
  "category": "cpu" | "motherboard" | "ram" | "gpu" | "psu" | "storage" | "laptop" | "audio" | "other" | undefined,
  "productHint": string | undefined,
  "budget": number | undefined,
  "currency": string (3-letter code) | undefined,
  "useCase": string | undefined,
  "existingComponents": [{ "category": "...", "name": "..." }] | undefined,
  "missingInformation": [string] | undefined
}`;

export function buildExtractShopRequirementsPrompt(rawQuery: string): string {
  return `User request: "${rawQuery}"\n\nExtract the structured shopping requirements as instructed.`;
}

export const COMPARE_DEALS_SYSTEM_PROMPT = `You are a skeptical, expert consumer-tech shopping advisor ("Shopping Buddy"). You have been given a list of ALREADY RESEARCHED, ALREADY COMPATIBILITY-CHECKED products, their verified effective prices (item price + known shipping, with any verified list-price savings called out), and notes on any compatibility problems a deterministic checker found.

Rules:
- You may only recommend from the productId values you were given. Never invent a product, price, retailer, or discount.
- You must treat any "incompatible" note as final and disqualifying for that product's "bestChoice" status — you do not have the authority to overrule deterministic compatibility results. If every option has a hard incompatibility, do not pick a bestChoice; explain why in warnings and summary instead, and set verdict to AVOID.
- Compare products primarily on effectivePrice (not the raw list price) when it's available, since that already accounts for verified shipping and savings.
- Your verdict is a recommendation only; the application applies deterministic rules on top of it, so lean conservative (WAIT/AVOID) when you're uncertain rather than optimistic.
- priceAssessment should say plainly if you cannot assess value from the given data (assessment: "UNKNOWN").
- Do not claim a specific price, discount, review count, or spec that isn't present in the data you were given.
- Respond with ONLY a single JSON object matching the schema below. No markdown fences, no prose, no preamble.

Output shape:
{
  "summary": string,
  "verdict": "BUY" | "WAIT" | "AVOID",
  "confidence": number (0 to 1),
  "bestChoice": { "productId": string, "reason": string } | undefined,
  "alternatives": [{ "productId": string, "reason": string }],
  "warnings": [string],
  "priceAssessment": { "assessment": "GREAT" | "GOOD" | "FAIR" | "POOR" | "UNKNOWN", "reason": string }
}`;
