import { afterEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

describe("AI output validation (malformed model output)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    createMock.mockReset();
  });

  it("REQUIRED: throws instead of trusting non-JSON model output", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "Sure, here's my answer: RAM looks good!" }],
    });

    const { extractRequirements, AiIntegrationError } = await import("@/lib/ai/claude");
    await expect(extractRequirements("I need 32GB RAM")).rejects.toBeInstanceOf(AiIntegrationError);
  });

  it("REQUIRED: throws instead of trusting JSON that violates the schema", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          // verdict is not one of BUY/WAIT/AVOID, confidence out of range
          text: JSON.stringify({
            summary: "ok",
            verdict: "DEFINITELY_BUY",
            confidence: 5,
            alternatives: [],
            warnings: [],
            priceAssessment: { assessment: "GOOD", reason: "cheap" },
          }),
        },
      ],
    });

    const { compareOptions, AiIntegrationError } = await import("@/lib/ai/claude");
    await expect(
      compareOptions({ rawRequest: "test", products: [], compatibilityNotes: [] })
    ).rejects.toBeInstanceOf(AiIntegrationError);
  });

  it("accepts well-formed, schema-valid JSON output", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            category: "ram",
            budget: 200,
            currency: "CAD",
          }),
        },
      ],
    });

    const { extractRequirements } = await import("@/lib/ai/claude");
    const result = await extractRequirements("I need 32GB RAM under $200 CAD");
    expect(result.category).toBe("ram");
  });

  it("REQUIRED: extractShopRequirements rejects a category outside the broader shop enum", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMock.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ category: "spaceship" }) }],
    });

    const { extractShopRequirements, AiIntegrationError } = await import("@/lib/ai/claude");
    await expect(extractShopRequirements("find me a spaceship")).rejects.toBeInstanceOf(AiIntegrationError);
  });

  it("accepts a well-formed shop extraction with a broader category and productHint", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ category: "laptop", productHint: "MacBook Air", budget: 1200, currency: "CAD" }),
        },
      ],
    });

    const { extractShopRequirements } = await import("@/lib/ai/claude");
    const result = await extractShopRequirements("Find me the best MacBook Air deal under $1,200 CAD");
    expect(result.category).toBe("laptop");
    expect(result.productHint).toBe("MacBook Air");
  });

  it("REQUIRED: compareDeals rejects malformed JSON just like compareOptions", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "Sure! Here's my pick." }],
    });

    const { compareDeals, AiIntegrationError } = await import("@/lib/ai/claude");
    await expect(
      compareDeals({ rawRequest: "test", products: [], compatibilityNotes: [] })
    ).rejects.toBeInstanceOf(AiIntegrationError);
  });
});
