"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DecisionBadge } from "@/components/DecisionBadge";
import { CompatibilityAlert } from "@/components/CompatibilityAlert";
import { CompatibilityShowdown } from "@/components/CompatibilityShowdown";
import { PriceBlock } from "@/components/PriceBlock";
import { DealQualityNote } from "@/components/DealQualityNote";
import { ProductComparison } from "@/components/ProductComparison";
import { ResearchProgress } from "@/components/ResearchProgress";
import { ResearchSources } from "@/components/ResearchSources";
import { pickPrimaryIssue } from "@/components/pickPrimaryIssue";
import type { ShopResult } from "@/types/shop";

type LoadState =
  | { status: "loading"; stage: number }
  | { status: "http-error"; message: string }
  | { status: "done"; result: ShopResult };

export default function ShopPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <ShopPageContent />
    </Suspense>
  );
}

function ShopPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  return <ShopReport key={query} query={query} />;
}

function ShopReport({ query }: { query: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading", stage: 0 });

  useEffect(() => {
    if (!query) {
      router.replace("/shop");
      return;
    }

    let cancelled = false;
    const stageTimer = setInterval(() => {
      setState((prev) =>
        prev.status === "loading" && prev.stage < 4 ? { status: "loading", stage: prev.stage + 1 } : prev
      );
    }, 700);

    (async () => {
      try {
        const res = await fetch("/api/shop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState({ status: "http-error", message: body.error ?? "Something went wrong." });
          return;
        }
        setState({ status: "done", result: body as ShopResult });
      } catch {
        if (!cancelled) {
          setState({ status: "http-error", message: "Could not reach the server. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stageTimer);
    };
  }, [query, router]);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <button
          onClick={() => router.push("/shop")}
          className="mb-8 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          ← New request
        </button>

        <p className="mb-8 font-serif text-xl italic text-ink-muted">&ldquo;{query}&rdquo;</p>

        {state.status === "loading" && <ResearchProgress stageIndex={state.stage} />}
        {state.status === "http-error" && <UnavailableNotice message={state.message} />}
        {state.status === "done" && <ShopOutcome result={state.result} />}
      </div>
    </main>
  );
}

/** Handles both HTTP-level failures (missing key, validation, crash) with the spec's exact copy for the AI-unavailable case. */
function UnavailableNotice({ message }: { message: string }) {
  const isAiUnavailable = /ANTHROPIC_API_KEY|AI reasoning service/i.test(message);
  return (
    <div className="border border-hairline bg-surface p-8">
      <p className="font-serif text-2xl text-ink">
        {isAiUnavailable ? "Analysis unavailable" : "Something went wrong"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {isAiUnavailable ? "AI analysis isn't configured yet." : message}
      </p>
    </div>
  );
}

function ShopOutcome({ result }: { result: ShopResult }) {
  if (result.status === "error") {
    return <UnavailableNotice message={result.warnings[0] ?? "Analysis isn't available right now."} />;
  }

  if (result.status === "research_unavailable") {
    return (
      <div className="border border-hairline bg-surface p-8">
        <p className="font-serif text-2xl text-ink">Research unavailable</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          We couldn&apos;t verify current listings, so we&apos;re not going to make up a recommendation.
        </p>
        {result.research.reason && <p className="mt-3 text-xs text-ink-muted">{result.research.reason}</p>}
      </div>
    );
  }

  if (result.status === "needs_clarification" || result.status === "no_results") {
    return (
      <div className="border border-hairline bg-surface p-8">
        <p className="font-serif text-2xl text-ink">{result.headline}</p>
        {result.followUpQuestions && result.followUpQuestions.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {result.followUpQuestions.map((q, i) => (
              <li key={i} className="text-sm text-ink-muted">
                {q}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return <DealReport result={result} />;
}

function DealReport({ result }: { result: ShopResult }) {
  const { primary, rest } = pickPrimaryIssue(result.compatibilityIssues, result.recommendation?.product.id);
  const currency = result.recommendation?.product.currency;
  const knownProducts = [
    ...(result.recommendation ? [result.recommendation.product] : []),
    ...result.alternatives.map((a) => a.product),
  ];

  return (
    <div className="flex flex-col gap-12">
      {result.recommendation ? (
        <section className="flex flex-col gap-6">
          <p className="text-sm text-ink-muted">Best deal</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <ProductThumbnail product={result.recommendation.product} />
            <div className="flex flex-1 flex-col gap-1">
              <h1 className="font-serif text-2xl leading-snug text-ink">{result.recommendation.product.name}</h1>
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <span>{result.recommendation.product.retailer ?? "Source unknown"}</span>
                <span aria-hidden>·</span>
                <span>{availabilityLabel(result.recommendation.product.availability)}</span>
              </div>
            </div>
          </div>

          <PriceBlock currency={currency} effectivePrice={result.recommendation.effectivePrice} />

          <div className="flex flex-col gap-3">
            <DecisionBadge decision={result.decision.verdict} />
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">{result.headline}</p>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <DecisionBadge decision={result.decision.verdict} />
          <h1 className="font-serif text-2xl leading-snug text-ink">{result.headline}</h1>
        </section>
      )}

      {result.followUpQuestions && result.followUpQuestions.length > 0 && (
        <Section label="Next step">
          <ul className="flex flex-col gap-2">
            {result.followUpQuestions.map((q, i) => (
              <li key={i} className="text-sm">
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.recommendation && (
        <Section label="Deal quality">
          <DealQualityNote
            decision={result.decision.verdict}
            productsConsidered={result.research.productsConsidered}
            researchAvailable={result.research.available}
          />
        </Section>
      )}

      {primary && (
        <Section label="Compatibility">
          <CompatibilityShowdown issue={primary} products={knownProducts} />
          {rest.length > 0 && (
            <div className="mt-6">
              <CompatibilityAlert issues={rest} products={knownProducts} />
            </div>
          )}
        </Section>
      )}
      {!primary && rest.length > 0 && (
        <Section label="Compatibility">
          <CompatibilityAlert issues={rest} products={knownProducts} />
        </Section>
      )}

      {result.alternatives.length > 0 && (
        <Section label="Other options">
          <ProductComparison
            alternatives={result.alternatives}
            winnerEffectivePrice={result.recommendation?.effectivePrice.effectivePrice}
            currency={currency}
          />
        </Section>
      )}

      {(() => {
        const distinctWarnings = result.warnings.filter(
          (w) => !primary || w !== primary.result.reasons.join(" ")
        );
        return (
          distinctWarnings.length > 0 && (
            <Section label="What to watch out for">
              <ul className="flex flex-col gap-2">
                {distinctWarnings.map((w, i) => (
                  <li key={i} className="text-sm text-decision-avoid">
                    {w}
                  </li>
                ))}
              </ul>
            </Section>
          )
        );
      })()}

      <ResearchSources products={knownProducts} fallbackSources={result.sources} />
    </div>
  );
}

function ProductThumbnail({ product }: { product: { name: string; imageUrl?: string } }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable retailer URLs; next/image requires allow-listing every retailer domain
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-24 w-24 shrink-0 border border-hairline object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-24 w-24 shrink-0 items-center justify-center border border-hairline bg-accent-soft font-serif text-2xl text-accent"
    >
      {product.name.charAt(0).toUpperCase()}
    </div>
  );
}

function availabilityLabel(availability?: "in_stock" | "out_of_stock" | "unknown"): string {
  switch (availability) {
    case "in_stock":
      return "In stock";
    case "out_of_stock":
      return "Out of stock";
    default:
      return "Availability unverified";
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-hairline pt-8">
      <p className="text-sm text-ink-muted">{label}</p>
      {children}
    </div>
  );
}
