import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    searchConfigured: Boolean(process.env.SEARCH_API_KEY),
  });
}
