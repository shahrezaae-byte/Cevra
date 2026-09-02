import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analyze", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("REQUIRED: returns 503 rather than proceeding when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const response = await POST(makeRequest({ request: "I need 32GB RAM for my gaming PC" }));
    expect(response.status).toBe(503);
  });

  it("rejects a request body that is too short", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(makeRequest({ request: "hi" }));
    expect(response.status).toBe(400);
  });

  it("rejects a request over the max length", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(makeRequest({ request: "a".repeat(1000) }));
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON bodies", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const response = await POST(
      new Request("http://localhost/api/analyze", { method: "POST", body: "{bad json" })
    );
    expect(response.status).toBe(400);
  });
});
