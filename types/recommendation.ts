import type { CompatibilityResult } from "./hardware";
import type { Product } from "./product";

export type Verdict = "BUY" | "WAIT" | "AVOID";

export type PriceAssessmentLabel = "GREAT" | "GOOD" | "FAIR" | "POOR" | "UNKNOWN";

export interface PriceAssessment {
  assessment: PriceAssessmentLabel;
  reason: string;
}

/** Structured output Claude must produce, validated before use. */
export interface AiRecommendation {
  summary: string;
  verdict: Verdict;
  confidence: number; // 0..1
  bestChoice?: {
    productId: string;
    reason: string;
  };
  alternatives: {
    productId: string;
    reason: string;
  }[];
  warnings: string[];
  priceAssessment: PriceAssessment;
}

export interface ProductScore {
  productId: string;
  total: number;
  breakdown: {
    compatibility: number;
    value: number;
    performance: number;
    reliability: number;
    reviews: number;
    availability: number;
  };
}

export interface CompatibilityIssue {
  involving: string[]; // product ids or names
  result: CompatibilityResult;
}

/** The final payload returned to the client from /api/analyze. */
export interface AnalysisResult {
  verdict: Verdict;
  headline: string;
  bestChoice?: {
    product: Product;
    reason: string;
  };
  alternatives: {
    product: Product;
    reason: string;
  }[];
  compatibilityIssues: CompatibilityIssue[];
  priceAssessment: PriceAssessment;
  warnings: string[];
  sources: {
    name: string;
    url?: string;
  }[];
  researchAvailable: boolean;
  followUpQuestions?: string[];
}
