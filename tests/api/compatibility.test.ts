import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/compatibility/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/compatibility", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/compatibility", () => {
  it("rejects malformed JSON with a 400", async () => {
    const response = await POST(makeRequest("{not valid json"));
    expect(response.status).toBe(400);
  });

  it("rejects a body with fewer than two components", async () => {
    const response = await POST(
      makeRequest({ cpu: { name: "Intel Core i9-14900K", socket: "LGA1700" } })
    );
    expect(response.status).toBe(400);
  });

  it("rejects an invalid socket enum value", async () => {
    const response = await POST(
      makeRequest({
        cpu: { name: "Mystery CPU", socket: "NOT_A_REAL_SOCKET" },
        motherboard: {
          name: "Some board",
          socket: "AM4",
          formFactor: "ATX",
          memoryGeneration: "DDR4",
        },
      })
    );
    expect(response.status).toBe(400);
  });

  it("REQUIRED: flags the i9-14900K + B550M-HDV pair as incompatible via the API", async () => {
    const response = await POST(
      makeRequest({
        cpu: { name: "Intel Core i9-14900K", socket: "LGA1700" },
        motherboard: {
          name: "ASRock B550M-HDV",
          socket: "AM4",
          formFactor: "Micro-ATX",
          memoryGeneration: "DDR4",
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.overallCompatible).toBe(false);
    expect(body.results[0].result.compatible).toBe(false);
  });

  it("returns overallCompatible true when all checked pairs are compatible", async () => {
    const response = await POST(
      makeRequest({
        cpu: { name: "AMD Ryzen 7 5800X3D", socket: "AM4" },
        motherboard: {
          name: "MSI B450 Tomahawk",
          socket: "AM4",
          formFactor: "ATX",
          memoryGeneration: "DDR4",
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.overallCompatible).toBe(true);
  });
});
