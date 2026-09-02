import type { Product } from "./product";
import type { CompatibilityIssue } from "./recommendation";
import type { EffectivePriceBreakdown } from "@/lib/decision/dealEngine";
import type { PurchaseDecision } from "@/lib/decision/purchaseDecision";

export type ShopStatus =
  | "success"
  | "research_unavailable"
  | "needs_clarification"
  | "no_results"
  | "error";

export interface ShopProductResult {
  product: Product;
  reason: string;
  effectivePrice: EffectivePriceBreakdown;
}

export interface ShopDecision {
  verdict: PurchaseDecision;
  reason: string;
}

export interface ShopResearchInfo {
  available: boolean;
  productsConsidered: number;
  /** Set when available is false, or when 0 products passed validation. */
  reason?: string;
}

/** The response shape for POST /api/shop. */
export interface ShopResult {
  status: ShopStatus;
  query: string;
  decision: ShopDecision;
  headline: string;
  recommendation?: ShopProductResult;
  alternatives: ShopProductResult[];
  compatibilityIssues: CompatibilityIssue[];
  research: ShopResearchInfo;
  warnings: string[];
  sources: { name: string; url?: string }[];
  followUpQuestions?: string[];
}
