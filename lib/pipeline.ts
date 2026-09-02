import type { HardwareCategory } from "@/types/hardware";
import type { Product } from "@/types/product";
import type {
  AnalysisResult,
  CompatibilityIssue,
} from "@/types/recommendation";
import { extractRequirements, compareOptions, AiIntegrationError } from "@/lib/ai/claude";
import { resolveSearchProvider } from "@/lib/research/search";
import {
  checkExistingComponentCompatibility,
  checkNewProductsAgainstExistingMotherboard,
} from "@/lib/compatibility/existingComponents";
import { calculateProductScore, median } from "@/lib/decision/scoring";
import { getVerdict } from "@/lib/decision/verdict";
import type { PurchaseRequirementsAiOutput } from "@/lib/validation/schemas";

/**
 * Runs the full purchasing-decision pipeline for one user request, per the
 * architecture: parse -> validate -> (maybe ask for more info) -> check
 * existing-component compatibility FIRST -> research -> normalize ->
 * compatibility -> AI comparison -> decision engine -> result.
 */
export async function runAnalysis(rawRequest: string): Promise<AnalysisResult> {
  let requirements: PurchaseRequirementsAiOutput;
  try {
    requirements = await extractRequirements(rawRequest);
  } catch (err) {
    return aiUnavailableResult(err);
  }

  // Step: check compatibility among components the user says they already
  // own BEFORE doing any new research. This is what makes the mandatory
  // "CPU/motherboard incompatible, stop before recommending RAM" scenario
  // work, and it never depends on Claude or a search provider.
  const existingCompatibilityIssues = checkExistingComponentCompatibility(requirements.existingComponents);
  const hardExistingFailure = existingCompatibilityIssues.find(
    (issue) => !issue.result.compatible && issue.result.confidence === "high"
  );

  if (hardExistingFailure) {
    return {
      verdict: "AVOID",
      headline: "Stop — your existing components are incompatible.",
      compatibilityIssues: existingCompatibilityIssues,
      priceAssessment: { assessment: "UNKNOWN", reason: "Not assessed — resolve the compatibility issue first." },
      alternatives: [],
      warnings: [hardExistingFailure.result.reasons.join(" ")],
      sources: [],
      researchAvailable: false,
      followUpQuestions: [
        `Find a compatible ${inferReplacementCategory(hardExistingFailure)} instead.`,
      ],
    };
  }

  if (needsMoreInformation(requirements)) {
    return {
      verdict: "WAIT",
      headline: "We need a bit more information before researching this.",
      compatibilityIssues: existingCompatibilityIssues,
      priceAssessment: { assessment: "UNKNOWN", reason: "Not enough information to assess price yet." },
      alternatives: [],
      warnings: [],
      sources: [],
      researchAvailable: false,
      followUpQuestions: requirements.missingInformation,
    };
  }

  const category = requirements.category as HardwareCategory;
  const { provider, configurationError } = resolveSearchProvider();

  if (!provider) {
    return {
      verdict: "WAIT",
      headline: "Live research isn't configured yet.",
      compatibilityIssues: existingCompatibilityIssues,
      priceAssessment: { assessment: "UNKNOWN", reason: "No live pricing available without a configured research provider." },
      alternatives: [],
      warnings: [configurationError ?? "Search provider is not configured."],
      sources: [],
      researchAvailable: false,
    };
  }

  let products: Product[];
  try {
    products = await provider.searchProducts(buildSearchQuery(rawRequest, requirements), category);
  } catch {
    return {
      verdict: "WAIT",
      headline: "Research failed — try again shortly.",
      compatibilityIssues: existingCompatibilityIssues,
      priceAssessment: { assessment: "UNKNOWN", reason: "Not assessed — research failed." },
      alternatives: [],
      warnings: ["The research provider did not return results. Please try again."],
      sources: [],
      researchAvailable: false,
    };
  }

  if (products.length === 0) {
    return {
      verdict: "WAIT",
      headline: "No products found for this request yet.",
      compatibilityIssues: existingCompatibilityIssues,
      priceAssessment: { assessment: "UNKNOWN", reason: "No products to assess." },
      alternatives: [],
      warnings: ["The research provider returned no results for this query."],
      sources: [],
      researchAvailable: true,
    };
  }

  // Compatibility of NEW candidate products against what the user already owns.
  const newProductIssues = checkNewProductsAgainstExistingMotherboard(products, requirements.existingComponents);
  const allIssues = [...existingCompatibilityIssues, ...newProductIssues];

  const compatibilityNotes = allIssues.map(
    (issue) => `${issue.involving.join(" + ")}: ${issue.result.reasons.join(" ")}`
  );

  let aiRecommendation;
  try {
    aiRecommendation = await compareOptions({
      rawRequest,
      products,
      compatibilityNotes,
    });
  } catch (err) {
    // AI comparison failed — fall back to the deterministic scoring alone
    // rather than blocking the whole result on an AI outage.
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

  const medianPrice = median(products.map((p) => p.price).filter((p): p is number => p !== undefined));
  const scores = products.map((product) =>
    calculateProductScore({
      product,
      compatibilityIssues: allIssues,
      comparableMedianPrice: medianPrice,
    })
  );
  const bestScore = [...scores].sort((a, b) => b.total - a.total)[0];
  const bestProduct = products.find((p) => p.id === bestScore?.productId);

  const verdict = getVerdict({
    compatibilityIssues: allIssues,
    bestScore,
    aiVerdict: aiRecommendation?.verdict,
    aiConfidence: aiRecommendation?.confidence,
  });

  const aiBestChoiceProduct = aiRecommendation?.bestChoice
    ? products.find((p) => p.id === aiRecommendation!.bestChoice!.productId)
    : undefined;

  const finalBestProduct = aiBestChoiceProduct ?? bestProduct;
  const finalBestReason =
    aiRecommendation?.bestChoice?.reason ??
    (bestScore ? `Highest overall score (${bestScore.total}/100) among researched options.` : undefined);

  return {
    verdict,
    headline: aiRecommendation?.summary ?? defaultHeadline(verdict),
    bestChoice:
      finalBestProduct && finalBestReason
        ? { product: finalBestProduct, reason: finalBestReason }
        : undefined,
    alternatives: (aiRecommendation?.alternatives ?? [])
      .map((alt) => {
        const product = products.find((p) => p.id === alt.productId);
        return product ? { product, reason: alt.reason } : undefined;
      })
      .filter((a): a is { product: Product; reason: string } => a !== undefined),
    compatibilityIssues: allIssues,
    priceAssessment: aiRecommendation?.priceAssessment ?? {
      assessment: "UNKNOWN",
      reason: "AI price assessment unavailable; ranking is based on deterministic scoring only.",
    },
    warnings: aiRecommendation?.warnings ?? [],
    sources: products
      .filter((p) => p.retailer)
      .map((p) => ({ name: p.retailer!, url: p.url })),
    researchAvailable: true,
  };
}

function needsMoreInformation(requirements: PurchaseRequirementsAiOutput): boolean {
  if (requirements.missingInformation && requirements.missingInformation.length > 0) {
    return true;
  }
  return !requirements.category;
}

function buildSearchQuery(rawRequest: string, requirements: PurchaseRequirementsAiOutput): string {
  const parts = [requirements.category, requirements.capacity, requirements.useCase].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(" ") : rawRequest;
}

function inferReplacementCategory(issue: CompatibilityIssue): string {
  const text = issue.result.reasons.join(" ").toLowerCase();
  if (text.includes("socket")) return "motherboard or CPU";
  return "component";
}

function defaultHeadline(verdict: AnalysisResult["verdict"]): string {
  switch (verdict) {
    case "BUY":
      return "This looks like a solid buy.";
    case "WAIT":
      return "Worth waiting before you commit.";
    case "AVOID":
      return "We'd avoid this one.";
  }
}

function aiUnavailableResult(err: unknown): AnalysisResult {
  return {
    verdict: "WAIT",
    headline: "AI reasoning is unavailable right now.",
    compatibilityIssues: [],
    priceAssessment: { assessment: "UNKNOWN", reason: "Not assessed — AI service unavailable." },
    alternatives: [],
    warnings: [
      err instanceof AiIntegrationError
        ? err.message
        : "Could not process this request right now. Please try again.",
    ],
    sources: [],
    researchAvailable: false,
  };
}
