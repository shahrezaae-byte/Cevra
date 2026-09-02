# Rigcheck — AI Purchasing Decision Engine (MVP)

> Don't just help users find products. Help them avoid making bad purchases.

Rigcheck takes a natural-language PC-hardware purchase request, researches
current products, checks hardware compatibility deterministically, compares
the viable options, and returns a clear **BUY / WAIT / AVOID** verdict —
with the reasoning shown, not hidden.

## What it does

1. Parses a request like *"I need 32GB RAM for my gaming PC"* into
   structured requirements.
2. If you mention hardware you already own (e.g. a CPU and motherboard),
   it checks **that** compatibility first, before recommending anything new.
3. Researches live products (when a search provider is configured) —
   it never fabricates prices, specs, reviews, or availability.
4. Runs every hard compatibility rule (CPU/motherboard socket, RAM
   generation/slots/capacity, GPU slot fit, PSU wattage) through
   deterministic, unit-tested code — Claude has no authority to override a
   hard incompatibility.
5. Asks Claude to compare the already-vetted options and explain the
   trade-offs, validated against a strict schema before it's trusted.
6. Combines all of that into one verdict, a best pick, alternatives, and a
   list of what to avoid.

## Requirements

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)
- (Optional, for live research) A [SerpApi](https://serpapi.com/) key

## Installation

```bash
npm install
cp .env.example .env
# then edit .env and add your keys
```

## Environment variables

| Variable            | Required | Purpose                                                                 |
| -------------------- | -------- | ------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`  | Yes      | Powers requirement extraction and option comparison.                    |
| `SEARCH_API_KEY`     | No       | SerpApi key for live product research. Without it, the app clearly says live research is unavailable instead of making up product data. |

Both are server-side only. Neither is ever sent to the browser.

## Local development

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Testing

```bash
npm test          # run once
npm run test:watch
```

Tests cover: the deterministic compatibility engine (including the
mandatory Intel LGA1700 vs. AMD AM4 case, and DDR4/DDR5 mismatches),
scoring and verdict logic, API request validation, missing-API-key
behavior, and rejection of malformed or schema-invalid AI output.

## Production build

```bash
npm run build
npm start
```

## Architecture

```
USER
  ↓
NEXT.JS UI            (app/, components/)
  ↓
API ROUTES            (app/api/*)
  ↓
RESEARCH LAYER        (lib/research/*)         — SearchProvider abstraction, SerpApi implementation
  ↓
PRODUCT NORMALIZATION (lib/research/products.ts) — never invents missing fields
  ↓
COMPATIBILITY ENGINE  (lib/compatibility/*)     — deterministic, Claude has no say here
  ↓
AI REASONING ENGINE   (lib/ai/*)                — structured extraction + comparison, schema-validated
  ↓
DECISION ENGINE       (lib/decision/*)          — scoring heuristics + verdict rules
  ↓
RESULT
```

`lib/pipeline.ts` orchestrates the full flow end to end and is what
`app/api/analyze/route.ts` calls.

### Why compatibility is deterministic

Claude is good at understanding language and explaining trade-offs. It is
not the source of truth for whether an Intel LGA1700 CPU fits an AMD AM4
motherboard — that's a lookup, not a judgment call. Every hard
compatibility rule lives in plain TypeScript under `lib/compatibility/`,
is unit tested, and a high-confidence "incompatible" result always forces
an `AVOID` verdict regardless of what the AI comparison step says.

## Known MVP limitations

- Only one search provider (SerpApi) is implemented; the `SearchProvider`
  interface exists so another backend can be added without touching the
  rest of the app.
- The "components you already own" compatibility check relies on a small,
  hand-curated table of well-known public specs
  (`lib/compatibility/knownHardware.ts`). Anything not in that table
  resolves to "unknown" fields, which the compatibility engine handles
  safely (low confidence, never a false "compatible: true") — it doesn't
  cover every part ever made.
- No performance/benchmark database yet — the performance and reliability
  subscores in the decision engine are neutral placeholders, documented as
  such in `lib/decision/scoring.ts`, not fabricated numbers.
- No accounts, database, payments, price tracking, affiliate links, mobile
  app, or browser extension — intentionally out of scope for this MVP.
- Rate limiting is a simple in-memory, single-process limiter
  (`lib/security/rateLimit.ts`) — fine for an MVP, not for multi-instance
  production deployment.
- GPU/case physical clearance and full PSU connector matching are only
  checked when the underlying dimensions are known; otherwise the engine
  reports low confidence rather than guessing.

---

## Phase 2 — Shopping Buddy

The MVP above (`/analyze`, `/api/analyze`) is the PC-hardware-specific
compatibility checker and is untouched. Phase 2 adds a broader,
consumer-facing **Shopping Buddy** flow on top of it, now the primary
entry point on the landing page.

### What's new

- **`POST /api/shop`** — takes `{ "query": "..." }` and returns a
  structured deal report: `status`, `decision` (BUY/WAIT/SKIP/UNKNOWN +
  reason), `recommendation`, `alternatives`, `compatibilityIssues`,
  `research`, `warnings`, `sources`.
- **`/shop`** — the consumer-facing report page (landing page now submits
  here by default). `/analyze` still exists for PC-hardware-specific
  checks and now has its own input instead of bouncing back to `/`.
- **Deal engine** (`lib/decision/dealEngine.ts`) — deterministic effective
  price (item + verified shipping + fees) and a documented deal-score
  heuristic. A verified "was/now" discount is shown as informational
  savings, never double-subtracted, and never fabricated when the source
  doesn't provide one.
- **Purchase decision layer** (`lib/decision/purchaseDecision.ts`) —
  deterministic BUY/WAIT/SKIP/UNKNOWN. Falls back to UNKNOWN rather than
  guessing when there isn't enough comparable data.
- **Shared compatibility helper**
  (`lib/compatibility/existingComponents.ts`) — the "check what the user
  already owns before recommending anything new" rule was extracted out of
  `lib/pipeline.ts` so both flows share one implementation (now also
  covers GPU-vs-motherboard, not just CPU/motherboard and RAM).
- **Broader product/category types** (`types/shopping.ts`) — `ShopCategory`
  is a superset of `HardwareCategory` so `Product` and `SearchProvider`
  can represent a laptop or a pair of headphones, without changing what
  the PC-hardware flow accepts or produces.
- **`Product`** gained `originalPrice`, `shippingCost`, and `imageUrl` —
  all `undefined` unless the source explicitly provided them.

### Same safety hierarchy as Phase 1

1. Deterministic hardware facts/rules (`lib/compatibility/*`)
2. Verified research/product data (`lib/research/*`, re-validated via
   `productSchema` before use)
3. AI reasoning and explanation (`lib/ai/*`, schema-validated, can only
   ever pull a decision *down* — e.g. BUY→WAIT — never up)

A high-confidence hard incompatibility is never merely scored lower — it
eliminates the product from consideration, and the pipeline checks
existing-component compatibility **before** doing any research at all
(see `lib/shop/pipeline.ts`).

### Testing

`npm test` covers Phase 2 in addition to the original 49:

- `tests/research/products.test.ts` — normalization, malformed data,
  missing price/URL, never-invent-shipping/discount.
- `tests/compatibility/existingComponents.test.ts` — the shared helper,
  including the mandatory CPU/motherboard case and GPU-vs-motherboard.
- `tests/decision/dealEngine.test.ts` — effective price math, elimination
  vs. demotion, discount verification.
- `tests/decision/purchaseDecision.test.ts` — BUY/WAIT/SKIP/UNKNOWN,
  including the "not enough data → UNKNOWN" rule.
- `tests/api/ai-output-validation.test.ts` (extended) — malformed/invalid
  JSON is rejected for the new shop-extraction and deal-comparison calls
  too.
- `tests/api/shop.test.ts` — request validation, missing API key.
- `tests/shop/pipeline.test.ts` — full pipeline integration tests (mocking
  the Anthropic SDK and the SerpApi fetch call) covering: a successful
  request, `SEARCH_API_KEY` missing, zero results, malformed AI
  extraction, AI-comparison failure falling back to deterministic
  ranking, the mandatory i9-14900K + B550M-HDV scenario short-circuiting
  before any research call, and a GPU-vs-existing-motherboard check.

### Known Phase 2 limitations

- No currency conversion — budget comparisons assume the researched
  price's currency matches the stated budget's currency.
- `productSchema` re-validation is defensive but shallow; it doesn't
  re-verify every nested specification field.
- The "verified discount" concept only recognizes a retailer-published
  original/list price in the same listing — it does not search for or
  apply separate coupon codes, since that would mean either fabricating a
  discount or adding a coupon-verification data source, both out of scope
  for this phase.
- Deal-score and purchase-decision thresholds are documented heuristics
  (see code comments in `lib/decision/dealEngine.ts` and
  `lib/decision/purchaseDecision.ts`), not statistically derived.
