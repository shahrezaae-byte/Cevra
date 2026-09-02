import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/research/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/research", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/research", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid request body", async () => {
    const response = await POST(makeRequest({ query: "" }));
    expect(response.status).toBe(400);
  });

  it("REQUIRED: reports research as unavailable rather than fabricating results when SEARCH_API_KEY is missing", async () => {
    vi.stubEnv("SEARCH_API_KEY", "");
    const response = await POST(makeRequest({ query: "32GB DDR5 RAM" }));
    const body = await response.json();

    expect(body.available).toBe(false);
    expect(body.products).toEqual([]);
    expect(body.reason).toMatch(/SEARCH_API_KEY/);
  });
});
