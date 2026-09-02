import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  aiRecommendationSchema,
  purchaseRequirementsSchema,
  shopRequirementsSchema,
  type AiRecommendationOutput,
  type PurchaseRequirementsAiOutput,
  type ShopRequirementsAiOutput,
} from "@/lib/validation/schemas";
import {
  EXTRACT_REQUIREMENTS_SYSTEM_PROMPT,
  buildExtractRequirementsPrompt,
  COMPARE_OPTIONS_SYSTEM_PROMPT,
  buildCompareOptionsPrompt,
  EXTRACT_SHOP_REQUIREMENTS_SYSTEM_PROMPT,
  buildExtractShopRequirementsPrompt,
  COMPARE_DEALS_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { Product } from "@/types/product";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;

export class AiIntegrationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AiIntegrationError";
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiIntegrationError("ANTHROPIC_API_KEY is not configured on the server.");
  }
  return new Anthropic({ apiKey });
}

/** Strip a ```json fence if Claude adds one despite instructions not to. */
function stripCodeFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");
}

async function callJsonModel<T>(
  system: string,
  userPrompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const client = getClient();

  let message: Anthropic.Messages.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    throw new AiIntegrationError("The AI reasoning service is unavailable right now.", err);
  }

  const raw = stripCodeFence(extractText(message));

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    throw new AiIntegrationError("The AI returned a response we couldn't parse.", err);
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw new AiIntegrationError(
      "The AI's response didn't match the expected structure and was rejected.",
      result.error
    );
  }

  return result.data;
}

/**
 * Step: natural language -> structured PurchaseRequirements.
 * Never trusted blindly — validated against purchaseRequirementsSchema.
 */
export async function extractRequirements(
  rawRequest: string
): Promise<PurchaseRequirementsAiOutput> {
  return callJsonModel(
    EXTRACT_REQUIREMENTS_SYSTEM_PROMPT,
    buildExtractRequirementsPrompt(rawRequest),
    purchaseRequirementsSchema
  );
}

/**
 * Step: compare already-normalized, already-compatibility-checked products
 * and produce a recommendation. Claude only reasons about products it was
 * given here — it cannot introduce products that weren't researched.
 */
export async function compareOptions(params: {
  rawRequest: string;
  products: Product[];
  compatibilityNotes: string[];
  effectivePrices?: Record<
    string,
    { effectivePrice?: number; shippingCost: number; shippingVerified: boolean; verifiedSavings: number; discountVerified: boolean }
  >;
}): Promise<AiRecommendationOutput> {
  return callJsonModel(
    COMPARE_OPTIONS_SYSTEM_PROMPT,
    buildCompareOptionsPrompt(params),
    aiRecommendationSchema
  );
}

// ---------------------------------------------------------------------------
// Shopping Buddy (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Step: natural language -> structured ShopRequirements. Broader than
 * extractRequirements (laptops, audio, etc., not just PC components), but
 * follows the same never-trust-blindly pattern — validated against
 * shopRequirementsSchema before use.
 */
export async function extractShopRequirements(rawQuery: string): Promise<ShopRequirementsAiOutput> {
  return callJsonModel(
    EXTRACT_SHOP_REQUIREMENTS_SYSTEM_PROMPT,
    buildExtractShopRequirementsPrompt(rawQuery),
    shopRequirementsSchema
  );
}

/**
 * Step: compare already-researched, already-compatibility-checked, already
 * effective-priced products and produce a deal recommendation. Reuses the
 * same output schema and prompt-building as compareOptions — only the
 * system prompt (deal-comparison framing) differs.
 */
export async function compareDeals(params: {
  rawRequest: string;
  products: Product[];
  compatibilityNotes: string[];
  effectivePrices?: Record<
    string,
    { effectivePrice?: number; shippingCost: number; shippingVerified: boolean; verifiedSavings: number; discountVerified: boolean }
  >;
}): Promise<AiRecommendationOutput> {
  return callJsonModel(
    COMPARE_DEALS_SYSTEM_PROMPT,
    buildCompareOptionsPrompt(params),
    aiRecommendationSchema
  );
}
