import { NextResponse } from "next/server";
import { shopRequestSchema } from "@/lib/validation/schemas";
import { runShopAnalysis } from "@/lib/shop/pipeline";
import { clientKeyFromRequest, isRateLimited } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  if (isRateLimited(clientKeyFromRequest(request))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The AI reasoning service isn't configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = shopRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  try {
    const result = await runShopAnalysis(parsed.data.query);
    return NextResponse.json(result);
  } catch (err) {
    // Never leak raw internal errors to the client.
    console.error("Shop pipeline failed:", err);
    return NextResponse.json(
      { error: "Something went wrong while researching this request. Please try again." },
      { status: 500 }
    );
  }
}
