import type { Product } from "@/types/product";
import type { ShopResult } from "@/types/shop";
import type { CompatibilityIssue } from "@/types/recommendation";
import { extractShopRequirements, compareDeals, AiIntegrationError } from "@/lib/ai/claude";
import { resolveSearchProvider } from "@/lib/research/search";
import {
  checkExistingComponentCompatibility,
  checkNewProductsAgainstExistingMotherboard,
} from "@/lib/compatibility/existingComponents";
import { calculateDealScore, calculateEffectivePrice, type EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import { getPurchaseDecision, type PurchaseDecision } from "@/lib/decision/purchaseDecision";
import { productSchema, type ShopRequirementsAiOutput } from "@/lib/validation/schemas";
import { median } from "@/lib/decision/scoring";

/**
 * Runs the full Shopping Buddy pipeline for one natural-language shopping
 * query, per the architecture:
 *
 *   parse intent -> check existing-component compatibility FIRST ->
 *   research -> normalize/validate -> effective price -> compatibility of
 *   candidates -> deal scoring (hard failures eliminate, not just demote) ->
 *   AI comparison (schema-validated, cannot override eliminations) ->
 *   deterministic purchase decision -> result
 *
 * Mirrors the shape of `lib/pipeline.ts` (the PC-hardware analyze flow) but
 * is broader in scope and reports a BUY/WAIT/SKIP/UNKNOWN decision instead
 * of BUY/WAIT/AVOID.
 */
export async function runShopAnalysis(rawQuery: string): Promise<ShopResult> {
  let requirements: ShopRequirementsAiOutput;
  try {
    requirements = await extractShopRequirements(rawQuery);
  } catch (err) {
    return aiUnavailableResult(rawQuery, err);
  }

  // Step: check compatibility among components the user says they already
  // own BEFORE doing any new research — same rule as the PC-hardware flow,
  // now shared code (lib/compatibility/existingComponents.ts).
  const existingCompatibilityIssues = checkExistingComponentCompatibility(requirements.existingComponents);
  const hardExistingFailure = existingCompatibilityIssues.find(
    (issue) => !issue.result.compatible && issue.result.confidence === "high"
  );

  if (hardExistingFailure) {
    return {
      status: "success",
      query: rawQuery,
      decision: { verdict: "SKIP", reason: hardExistingFailure.result.reasons.join(" ") },
      headline: "Stop — your existing components are incompatible.",
      alternatives: [],
      compatibilityIssues: existingCompatibilityIssues,
      research: { available: false, productsConsidered: 0 },
      warnings: [hardExistingFailure.result.reasons.join(" ")],
      sources: [],
      followUpQuestions: [`Find a compatible ${inferReplacementCategory(hardExistingFailure)} instead.`],
    };
  }

  if (needsMoreInformation(requirements)) {
    return {
      status: "needs_clarification",
      query: rawQuery,
      decision: { verdict: "UNKNOWN", reason: "Not enough information to research this yet." },
      headline: "We need a bit more information before researching this.",
      alternatives: [],
      compatibilityIssues: existingCompatibilityIssues,
      research: { available: false, productsConsidered: 0 },
      warnings: [],
      sources: [],
      followUpQuestions:
        requirements.missingInformation && requirements.missingInformation.length > 0
          ? requirements.missingInformation
          : ["What product or category are you shopping for?"],
    };
  }

  const { provider, configurationError } = resolveSearchProvider();
  if (!provider) {
    const reason = configurationError ?? "Search provider is not configured.";
    return {
      status: "research_unavailable",
      query: rawQuery,
      decision: { verdict: "UNKNOWN", reason: "Research is unavailable, so no deal can be verified." },
      headline: "Live research isn't configured yet.",
      alternatives: [],
      compatibilityIssues: existingCompatibilityIssues,
      research: { available: false, productsConsidered: 0, reason },
      warnings: [reason],
      sources: [],
    };
  }

  let rawProducts: Product[];
  try {
    rawProducts = await provider.searchProducts(
      buildShopSearchQuery(rawQuery, requirements),
      requirements.category
    );
  } catch {
    const reason = "The research provider did not return results. Please try again.";
    return {
      status: "research_unavailable",
      query: rawQuery,
      decision: { verdict: "UNKNOWN", reason: "Research failed, so no deal can be verified." },
      headline: "Research failed — try again shortly.",
      alternatives: [],
      compatibilityIssues: existingCompatibilityIssues,
      research: { available: false, productsConsidered: 0, reason },
      warnings: [reason],
      sources: [],
    };
  }

  // Defensive re-validation: drop anything malformed rather than letting it
  // flow into pricing math or the UI.
  const products = rawProducts.filter((p) => productSchema.safeParse(p).success);

  if (products.length === 0) {
    return {
      status: "no_results",
      query: rawQuery,
      decision: { verdict: "UNKNOWN", reason: "No usable products were found for this request." },
      headline: "No products found for this request yet.",
      alternatives: [],
      compatibilityIssues: existingCompatibilityIssues,
      research: { available: true, productsConsidered: 0, reason: "The research provider returned no usable results." },
      warnings: ["The research provider returned no usable results for this query."],
      sources: [],
    };
  }

  // Compatibility of NEW candidate products against what the user already owns.
  const newProductIssues = checkNewProductsAgainstExistingMotherboard(products, requirements.existingComponents);
  const allIssues = [...existingCompatibilityIssues, ...newProductIssues];
  const compatibilityNotes = allIssues.map(
    (issue) => `${issue.involving.join(" + ")}: ${issue.result.reasons.join(" ")}`
  );

  // Effective price + deal score for every candidate. Hard compatibility
  // failures eliminate a product from consideration entirely.
  const effectivePrices: Record<string, EffectivePriceBreakdown> = {};
  for (const product of products) {
    effectivePrices[product.id] = calculateEffectivePrice(product);
  }
  const medianEffectivePrice = median(
    products.map((p) => effectivePrices[p.id].effectivePrice).filter((v): v is number => v !== undefined)
  );

  const dealScores = products.map((product) =>
    calculateDealScore({
      product,
      effectivePrice: effectivePrices[product.id],
      compatibilityIssues: allIssues,
      comparableMedianEffectivePrice: medianEffectivePrice,
      meetsBudget: computeMeetsBudget(effectivePrices[product.id], requirements.budget),
    })
  );

  const eliminatedIds = new Set(dealScores.filter((s) => s.eliminated).map((s) => s.productId));
  const viableProducts = products.filter((p) => !eliminatedIds.has(p.id));

  if (viableProducts.length === 0) {
    const eliminationReasons = [
      ...new Set(dealScores.filter((s) => s.eliminationReason).map((s) => s.eliminationReason!)),
    ];
    return {
      status: "success",
      query: rawQuery,
      decision: { verdict: "SKIP", reason: "Every researched option failed a hard compatibility check." },
      headline: "None of the researched options are compatible.",
      alternatives: [],
      compatibilityIssues: allIssues,
      research: { available: true, productsConsidered: products.length },
      warnings: eliminationReasons,
      sources: products.filter((p) => p.retailer).map((p) => ({ name: p.retailer!, url: p.url })),
    };
  }

  const effectivePricesForPrompt = Object.fromEntries(
    viableProducts.map((p) => [p.id, effectivePrices[p.id]])
  );

  let aiRecommendation;
  try {
    aiRecommendation = await compareDeals({
      rawRequest: rawQuery,
      products: viableProducts,
      compatibilityNotes,
      effectivePrices: effectivePricesForPrompt,
    });
  } catch (err) {
    aiRecommendation = undefined;
    allIssues.push({
      involving: ["ai-comparison"],
      result: {
        compatible: true,
        confidence: "low",
        reasons: [
          err instanceof AiIntegrationError
            ? err.message
            : "AI comparison was unavailable; showing deterministic ranking only.",
        ],
      },
    });
  }

  const viableScores = dealScores.filter((s) => !eliminatedIds.has(s.productId));
  const bestDealScore = [...viableScores].sort((a, b) => b.total - a.total)[0];
  const bestProductDeterministic = viableProducts.find((p) => p.id === bestDealScore?.productId);

  const aiBestChoiceProduct = aiRecommendation?.bestChoice
    ? viableProducts.find((p) => p.id === aiRecommendation!.bestChoice!.productId)
    : undefined;

  const finalBestProduct = aiBestChoiceProduct ?? bestProductDeterministic;
  const finalBestReason =
    aiRecommendation?.bestChoice?.reason ??
    (bestDealScore
      ? `Best overall deal score (${bestDealScore.total}/100) among researched, compatible options.`
      : undefined);

  const meetsBudgetForBest = finalBestProduct
    ? computeMeetsBudget(effectivePrices[finalBestProduct.id], requirements.budget)
    : undefined;
  const discountVerifiedForBest = finalBestProduct
    ? effectivePrices[finalBestProduct.id].discountVerified
    : false;

  const deterministicDecision = getPurchaseDecision({
    allEliminated: false,
    bestDealScore,
    meetsBudget: meetsBudgetForBest,
    discountVerified: discountVerifiedForBest,
    hasComparableAlternatives: viableProducts.length > 1,
  });

  const finalDecision = combineWithAiVerdict(deterministicDecision, aiRecommendation?.verdict);

  const alternatives = (aiRecommendation?.alternatives ?? [])
    .map((alt) => {
      const product = viableProducts.find((p) => p.id === alt.productId);
      return product
        ? { product, reason: alt.reason, effectivePrice: effectivePrices[product.id] }
        : undefined;
    })
    .filter((a): a is { product: Product; reason: string; effectivePrice: EffectivePriceBreakdown } => a !== undefined);

  return {
    status: "success",
    query: rawQuery,
    decision: { verdict: finalDecision, reason: decisionReason(finalDecision, bestDealScore, meetsBudgetForBest) },
    headline: aiRecommendation?.summary ?? defaultShopHeadline(finalDecision),
    recommendation:
      finalBestProduct && finalBestReason
        ? { product: finalBestProduct, reason: finalBestReason, effectivePrice: effectivePrices[finalBestProduct.id] }
        : undefined,
    alternatives,
    compatibilityIssues: allIssues,
    research: { available: true, productsConsidered: products.length },
    warnings: aiRecommendation?.warnings ?? [],
    sources: products.filter((p) => p.retailer).map((p) => ({ name: p.retailer!, url: p.url })),
  };
}

function needsMoreInformation(requirements: ShopRequirementsAiOutput): boolean {
  if (requirements.missingInformation && requirements.missingInformation.length > 0) {
    return true;
  }
  return !requirements.category && !requirements.productHint;
}

function buildShopSearchQuery(rawQuery: string, requirements: ShopRequirementsAiOutput): string {
  if (requirements.productHint) return requirements.productHint;
  const parts = [requirements.category, requirements.useCase].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : rawQuery;
}

function computeMeetsBudget(
  effectivePrice: EffectivePriceBreakdown,
  budget?: number
): boolean | undefined {
  if (budget === undefined || effectivePrice.effectivePrice === undefined) return undefined;
  return effectivePrice.effectivePrice <= budget;
}

const DECISION_RANK: Record<PurchaseDecision, number> = { SKIP: 0, UNKNOWN: 1, WAIT: 2, BUY: 3 };
const DECISION_BY_RANK: PurchaseDecision[] = ["SKIP", "UNKNOWN", "WAIT", "BUY"];

/**
 * AI can only ever pull the deterministic decision DOWN (e.g. flag a real
 * concern the deterministic layer missed), never push it up — mirrors the
 * rule in `lib/decision/verdict.ts` for the PC-hardware flow.
 */
function combineWithAiVerdict(
  deterministic: PurchaseDecision,
  aiVerdict?: "BUY" | "WAIT" | "AVOID"
): PurchaseDecision {
  if (!aiVerdict) return deterministic;
  const aiMapped: PurchaseDecision = aiVerdict === "AVOID" ? "SKIP" : aiVerdict;
  const rank = Math.min(DECISION_RANK[deterministic], DECISION_RANK[aiMapped]);
  return DECISION_BY_RANK[rank];
}

function decisionReason(
  decision: PurchaseDecision,
  bestDealScore: ReturnType<typeof calculateDealScore> | undefined,
  meetsBudget: boolean | undefined
): string {
  switch (decision) {
    case "BUY":
      return "Strong verified deal that satisfies the request.";
    case "WAIT":
      return "Meets the request, but the current price isn't clearly a strong deal based on available comparisons.";
    case "SKIP":
      return meetsBudget === false
        ? "The best option found exceeds the stated budget."
        : "Doesn't meet requirements or is materially worse value than alternatives.";
    case "UNKNOWN":
    default:
      return bestDealScore
        ? "Not enough comparable data to confidently judge whether this is a good deal."
        : "Not enough information to make a call yet.";
  }
}

function inferReplacementCategory(issue: CompatibilityIssue): string {
  const text = issue.result.reasons.join(" ").toLowerCase();
  if (text.includes("socket")) return "motherboard or CPU";
  return "component";
}

function defaultShopHeadline(decision: PurchaseDecision): string {
  switch (decision) {
    case "BUY":
      return "This looks like a solid buy.";
    case "WAIT":
      return "Worth waiting before you commit.";
    case "SKIP":
      return "We'd skip this one.";
    case "UNKNOWN":
    default:
      return "Not enough information for a confident call yet.";
  }
}

function aiUnavailableResult(query: string, err: unknown): ShopResult {
  return {
    status: "error",
    query,
    decision: { verdict: "UNKNOWN", reason: "AI reasoning is unavailable." },
    headline: "AI reasoning is unavailable right now.",
    alternatives: [],
    compatibilityIssues: [],
    research: { available: false, productsConsidered: 0 },
    warnings: [
      err instanceof AiIntegrationError
        ? err.message
        : "Could not process this request right now. Please try again.",
    ],
    sources: [],
  };
}
