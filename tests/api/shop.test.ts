import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/shop/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/shop", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/shop", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("REQUIRED: returns 503 rather than proceeding when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const response = await POST(makeRequest({ query: "Find me the best RTX 5070 deal" }));
    expect(response.status).toBe(503);
  });

  it("rejects a request body that is too short", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(makeRequest({ query: "hi" }));
    expect(response.status).toBe(400);
  });

  it("REQUIRED: rejects a missing query field", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("rejects a request over the max length", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(makeRequest({ query: "a".repeat(1000) }));
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON bodies", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(
      new Request("http://localhost/api/shop", { method: "POST", body: "{bad json" })
    );
    expect(response.status).toBe(400);
  });
});
