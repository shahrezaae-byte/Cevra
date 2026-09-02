import { describe, expect, it } from "vitest";
import { getVerdict } from "@/lib/decision/verdict";
import type { CompatibilityIssue } from "@/types/recommendation";

const highConfidenceIncompatible: CompatibilityIssue = {
  involving: ["cpu-1", "mobo-1"],
  result: { compatible: false, confidence: "high", reasons: ["socket mismatch"] },
};

const lowConfidenceIncompatible: CompatibilityIssue = {
  involving: ["ram-1", "mobo-1"],
  result: { compatible: false, confidence: "low", reasons: ["unknown generation"] },
};

const compatible: CompatibilityIssue = {
  involving: ["cpu-1", "mobo-1"],
  result: { compatible: true, confidence: "high", reasons: ["socket match"] },
};

describe("getVerdict", () => {
  it("REQUIRED: forces AVOID on a high-confidence hard incompatibility regardless of AI opinion", () => {
    const verdict = getVerdict({
      compatibilityIssues: [highConfidenceIncompatible],
      aiVerdict: "BUY",
      aiConfidence: 0.95,
    });
    expect(verdict).toBe("AVOID");
  });

  it("returns WAIT when compatibility is uncertain (low confidence) rather than a false BUY", () => {
    const verdict = getVerdict({
      compatibilityIssues: [lowConfidenceIncompatible],
      aiVerdict: "BUY",
    });
    expect(verdict).toBe("WAIT");
  });

  it("returns BUY when everything is compatible and AI agrees", () => {
    const verdict = getVerdict({
      compatibilityIssues: [compatible],
      bestScore: {
        productId: "ram-1",
        total: 85,
        breakdown: {
          compatibility: 100,
          value: 80,
          performance: 50,
          reliability: 55,
          reviews: 90,
          availability: 100,
        },
      },
      aiVerdict: "BUY",
    });
    expect(verdict).toBe("BUY");
  });

  it("lets AI downgrade BUY to WAIT but never lets AI upgrade past a hard AVOID", () => {
    const downgraded = getVerdict({
      compatibilityIssues: [compatible],
      bestScore: {
        productId: "ram-1",
        total: 85,
        breakdown: { compatibility: 100, value: 80, performance: 50, reliability: 55, reviews: 90, availability: 100 },
      },
      aiVerdict: "WAIT",
    });
    expect(downgraded).toBe("WAIT");

    const stillAvoid = getVerdict({
      compatibilityIssues: [highConfidenceIncompatible],
      aiVerdict: "BUY",
      aiConfidence: 1,
    });
    expect(stillAvoid).toBe("AVOID");
  });

  it("returns AVOID when the best available score is very low even without a compatibility flag", () => {
    const verdict = getVerdict({
      compatibilityIssues: [compatible],
      bestScore: {
        productId: "ram-1",
        total: 30,
        breakdown: { compatibility: 100, value: 10, performance: 20, reliability: 20, reviews: 10, availability: 50 },
      },
    });
    expect(verdict).toBe("AVOID");
  });
});
