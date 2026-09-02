import { NextResponse } from "next/server";
import { researchRequestSchema } from "@/lib/validation/schemas";
import { resolveSearchProvider } from "@/lib/research/search";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = researchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { provider, configurationError } = resolveSearchProvider();
  if (!provider) {
    return NextResponse.json(
      {
        available: false,
        reason: configurationError,
        products: [],
      },
      { status: 200 }
    );
  }

  try {
    const products = await provider.searchProducts(parsed.data.query, parsed.data.category);
    return NextResponse.json({ available: true, products: products.slice(0, 20) });
  } catch {
    // Never surface raw provider errors (could leak internals); log server-side only.
    console.error("Research provider request failed");
    return NextResponse.json(
      { available: false, reason: "The research provider failed to respond. Please try again.", products: [] },
      { status: 502 }
    );
  }
}
