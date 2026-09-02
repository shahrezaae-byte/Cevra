/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * This is intentionally simple for the MVP: no Redis, no database. It resets
 * on server restart and doesn't share state across multiple instances —
 * that's a known limitation (documented in the README), not an oversight.
 * It's still useful protection against a single client hammering the AI/
 * search endpoints from one process.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const existing = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (existing.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, existing);
    return true;
  }

  existing.push(now);
  hits.set(key, existing);
  return false;
}

export function clientKeyFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}
