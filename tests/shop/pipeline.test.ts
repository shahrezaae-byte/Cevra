import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

function aiTextResponse(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function serpApiResponse(shoppingResults: Record<string, unknown>[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ shopping_results: shoppingResults }),
  };
}

describe("runShopAnalysis (Shopping Buddy pipeline)", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("SEARCH_API_KEY", "test-search-key");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    createMock.mockReset();
    fetchMock.mockReset();
  });

  it("REQUIRED: a successful shopping request returns a ranked recommendation from real research data", async () => {
    createMock
      .mockResolvedValueOnce(aiTextResponse({ category: "gpu", productHint: "RTX 5070" }))
      .mockResolvedValueOnce(
        aiTextResponse({
          summary: "The Best Buy listing is the strongest verified deal.",
          verdict: "BUY",
          confidence: 0.8,
          bestChoice: { productId: "gpu-a", reason: "Lowest effective price with a verified discount." },
          alternatives: [{ productId: "gpu-b", reason: "Slightly pricier, no verified discount." }],
          warnings: [],
          priceAssessment: { assessment: "GOOD", reason: "Below the market median for this card." },
        })
      );
    fetchMock.mockResolvedValueOnce(
      serpApiResponse([
        {
          product_id: "gpu-a",
          title: "NVIDIA RTX 5070",
          extracted_price: 650,
          extracted_old_price: 749,
          price: "$650.00",
          shipping: "Free shipping",
          source: "Best Buy",
          product_link: "https://example.com/gpu-a",
          availability: "In stock",
        },
        {
          product_id: "gpu-b",
          title: "NVIDIA RTX 5070 (Other Brand)",
          extracted_price: 699,
          price: "$699.00",
          source: "Newegg",
          product_link: "https://example.com/gpu-b",
          availability: "In stock",
        },
      ])
    );

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis("Find me the best RTX 5070 deal");

    expect(result.status).toBe("success");
    expect(result.research.available).toBe(true);
    expect(result.research.productsConsidered).toBe(2);
    expect(result.recommendation?.product.id).toBe("gpu-a");
    expect(result.recommendation?.effectivePrice.discountVerified).toBe(true);
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].product.id).toBe("gpu-b");
    expect(result.sources.map((s) => s.name)).toEqual(expect.arrayContaining(["Best Buy", "Newegg"]));
  });

  it("REQUIRED: returns research_unavailable (not a fabricated result) when SEARCH_API_KEY is missing", async () => {
    vi.stubEnv("SEARCH_API_KEY", "");
    createMock.mockResolvedValueOnce(aiTextResponse({ category: "gpu", productHint: "RTX 5070" }));

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis("Find me the best RTX 5070 deal");

    expect(result.status).toBe("research_unavailable");
    expect(result.decision.verdict).toBe("UNKNOWN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns no_results when the provider returns zero listings", async () => {
    createMock.mockResolvedValueOnce(aiTextResponse({ category: "audio", productHint: "AirPods Pro 3" }));
    fetchMock.mockResolvedValueOnce(serpApiResponse([]));

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis("I need AirPods under $200");

    expect(result.status).toBe("no_results");
    expect(result.research.productsConsidered).toBe(0);
  });

  it("REQUIRED: malformed AI extraction output results in a graceful error, not a fabricated recommendation", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "Sure, here's a great GPU for you!" }] });

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis("Find me the best RTX 5070 deal");

    expect(result.status).toBe("error");
    expect(result.recommendation).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to deterministic best-deal selection when the AI comparison call fails", async () => {
    createMock
      .mockResolvedValueOnce(aiTextResponse({ category: "gpu", productHint: "RTX 5070" }))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "not json at all" }] });
    fetchMock.mockResolvedValueOnce(
      serpApiResponse([
        {
          product_id: "gpu-cheap",
          title: "NVIDIA RTX 5070 Budget Model",
          extracted_price: 620,
          source: "Retailer A",
          product_link: "https://example.com/cheap",
          availability: "In stock",
        },
        {
          product_id: "gpu-expensive",
          title: "NVIDIA RTX 5070 Premium Model",
          extracted_price: 780,
          source: "Retailer B",
          product_link: "https://example.com/expensive",
          availability: "In stock",
        },
      ])
    );

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis("Find me the best RTX 5070 deal");

    expect(result.status).toBe("success");
    // deterministic scoring should prefer the cheaper, in-stock option
    expect(result.recommendation?.product.id).toBe("gpu-cheap");
    expect(
      result.compatibilityIssues.some((i) => /couldn't parse|unavailable|AI comparison/i.test(i.result.reasons.join(" ")))
    ).toBe(true);
  });

  it("REQUIRED: the mandatory i9-14900K + ASRock B550M-HDV scenario is caught before any research happens", async () => {
    createMock.mockResolvedValueOnce(
      aiTextResponse({
        category: "ram",
        existingComponents: [
          { category: "cpu", name: "Intel Core i9-14900K" },
          { category: "motherboard", name: "ASRock B550M-HDV" },
        ],
      })
    );

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis(
      "I have an Intel Core i9-14900K and an ASRock B550M-HDV. I want to buy RAM."
    );

    expect(result.status).toBe("success");
    expect(result.decision.verdict).toBe("SKIP");
    expect(result.headline).toMatch(/incompatible/i);
    expect(fetchMock).not.toHaveBeenCalled();
    // only one AI call (extraction) — comparison is never reached
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("REQUIRED: a GPU search against an existing motherboard runs the deterministic GPU compatibility check", async () => {
    createMock
      .mockResolvedValueOnce(
        aiTextResponse({
          category: "gpu",
          existingComponents: [{ category: "motherboard", name: "ASRock B550M-HDV" }],
        })
      )
      .mockResolvedValueOnce(
        aiTextResponse({
          summary: "This card fits your board and is well priced.",
          verdict: "BUY",
          confidence: 0.7,
          bestChoice: { productId: "gpu-fit", reason: "Compatible and reasonably priced." },
          alternatives: [],
          warnings: [],
          priceAssessment: { assessment: "GOOD", reason: "Fair market price." },
        })
      );
    fetchMock.mockResolvedValueOnce(
      serpApiResponse([
        {
          product_id: "gpu-fit",
          title: "NVIDIA RTX 4060",
          extracted_price: 400,
          source: "Retailer A",
          product_link: "https://example.com/fit",
          availability: "In stock",
        },
      ])
    );

    const { runShopAnalysis } = await import("@/lib/shop/pipeline");
    const result = await runShopAnalysis("Find me a GPU compatible with my existing hardware");

    const gpuIssue = result.compatibilityIssues.find((i) => i.involving.includes("gpu-fit"));
    expect(gpuIssue).toBeDefined();
    expect(gpuIssue?.result.compatible).toBe(true);
  });
});
