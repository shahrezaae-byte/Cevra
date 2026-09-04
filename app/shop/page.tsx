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
    <Suspense
      fallback={
        <main className="flex-1">
          <div className="mx-auto max-w-4xl px-6 py-16" />
        </main>
      }
    >
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

  const [state, setState] = useState<LoadState>({
    status: "loading",
    stage: 0,
  });

  useEffect(() => {
    if (!query) {
      router.replace("/shop");
      return;
    }

    let cancelled = false;

    const stageTimer = setInterval(() => {
      setState((prev) =>
        prev.status === "loading" && prev.stage < 4
          ? {
              status: "loading",
              stage: prev.stage + 1,
            }
          : prev,
      );
    }, 700);

    (async () => {
      try {
        const res = await fetch("/api/shop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        const body = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setState({
            status: "http-error",
            message: body.error ?? "Something went wrong.",
          });
          return;
        }

        setState({
          status: "done",
          result: body as ShopResult,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "http-error",
            message:
              "Could not reach the server. Please try again.",
          });
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
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
        <button
          onClick={() => router.push("/shop")}
          className="group inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            ←
          </span>
          New request
        </button>

        <div className="mt-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Your request
          </p>

          <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
            {query}
          </h1>
        </div>

        <div className="mt-10">
          {state.status === "loading" && (
            <ResearchProgress stageIndex={state.stage} />
          )}

          {state.status === "http-error" && (
            <UnavailableNotice message={state.message} />
          )}

          {state.status === "done" && (
            <ShopOutcome result={state.result} />
          )}
        </div>
      </div>
    </main>
  );
}

function UnavailableNotice({
  message,
}: {
  message: string;
}) {
  const isAiUnavailable =
    /ANTHROPIC_API_KEY|AI reasoning service/i.test(message);

  return (
    <div className="rounded-2xl border border-hairline bg-surface px-6 py-7 sm:px-8 sm:py-8">
      <div className="flex items-start gap-4">
        <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-decision-unknown" />

        <div>
          <p className="font-serif text-2xl tracking-[-0.015em] text-ink">
            {isAiUnavailable
              ? "Analysis unavailable"
              : "Something went wrong"}
          </p>

          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
            {isAiUnavailable
              ? "AI analysis isn't configured yet."
              : message}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShopOutcome({
  result,
}: {
  result: ShopResult;
}) {
  if (result.status === "error") {
    return (
      <UnavailableNotice
        message={
          result.warnings[0] ??
          "Analysis isn't available right now."
        }
      />
    );
  }

  if (result.status === "research_unavailable") {
    return (
      <div className="rounded-2xl border border-hairline bg-surface px-6 py-7 sm:px-8 sm:py-8">
        <p className="font-serif text-2xl tracking-[-0.015em] text-ink">
          Research unavailable
        </p>

        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
          We couldn&apos;t verify current listings, so we&apos;re not
          going to make up a recommendation.
        </p>

        {result.research.reason && (
          <p className="mt-4 border-t border-hairline pt-4 text-xs leading-5 text-ink-muted">
            {result.research.reason}
          </p>
        )}
      </div>
    );
  }

  if (
    result.status === "needs_clarification" ||
    result.status === "no_results"
  ) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface px-6 py-7 sm:px-8 sm:py-8">
        <p className="font-serif text-2xl tracking-[-0.015em] text-ink">
          {result.headline}
        </p>

        {result.followUpQuestions &&
          result.followUpQuestions.length > 0 && (
            <div className="mt-6 border-t border-hairline pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                What we need to know
              </p>

              <ul className="mt-3 flex flex-col gap-2">
                {result.followUpQuestions.map((question, i) => (
                  <li
                    key={i}
                    className="text-sm leading-6 text-ink"
                  >
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    );
  }

  return <DealReport result={result} />;
}

function DealReport({
  result,
}: {
  result: ShopResult;
}) {
  const { primary, rest } = pickPrimaryIssue(
    result.compatibilityIssues,
    result.recommendation?.product.id,
  );

  const currency =
    result.recommendation?.product.currency;

  const knownProducts = [
    ...(result.recommendation
      ? [result.recommendation.product]
      : []),
    ...result.alternatives.map(
      (alternative) => alternative.product,
    ),
  ];

  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      {result.recommendation ? (
        <section>
          <div className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-4 sm:gap-5">
                  <ProductThumbnail
                    product={result.recommendation.product}
                  />

                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      CEVRA&apos;s pick
                    </p>

                    <h2 className="font-serif text-2xl leading-snug tracking-[-0.02em] text-ink sm:text-3xl">
                      {result.recommendation.product.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                      <span className="font-medium text-ink">
                        {result.recommendation.product.retailer ??
                          "Source unknown"}
                      </span>

                      <span aria-hidden="true">
                        ·
                      </span>

                      <span>
                        {availabilityLabel(
                          result.recommendation.product
                            .availability,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <DecisionBadge
                    decision={result.decision.verdict}
                  />
                </div>
              </div>

              <div className="border-t border-hairline pt-7">
                <PriceBlock
                  currency={currency}
                  effectivePrice={
                    result.recommendation.effectivePrice
                  }
                />
              </div>

              <div className="border-t border-hairline pt-6">
                <p className="max-w-2xl text-base leading-7 text-ink">
                  {result.headline}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
          <DecisionBadge
            decision={result.decision.verdict}
          />

          <h1 className="mt-6 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.025em] text-ink">
            {result.headline}
          </h1>
        </section>
      )}

      {result.followUpQuestions &&
        result.followUpQuestions.length > 0 && (
          <ReportSection
            eyebrow="Next step"
            title="Before you buy"
          >
            <ul className="flex flex-col gap-3">
              {result.followUpQuestions.map(
                (question, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-hairline bg-surface px-5 py-4 text-sm leading-6 text-ink"
                  >
                    {question}
                  </li>
                ),
              )}
            </ul>
          </ReportSection>
        )}

      {result.recommendation && (
        <ReportSection
          eyebrow="Deal assessment"
          title="How good is this price?"
        >
          <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
            <DealQualityNote
              decision={result.decision.verdict}
              productsConsidered={
                result.research.productsConsidered
              }
              researchAvailable={
                result.research.available
              }
            />
          </div>
        </ReportSection>
      )}

      {(primary || rest.length > 0) && (
        <ReportSection
          eyebrow="Compatibility"
          title="Will everything work together?"
        >
          <div className="flex flex-col gap-5">
            {primary && (
              <CompatibilityShowdown
                issue={primary}
                products={knownProducts}
              />
            )}

            {rest.length > 0 && (
              <CompatibilityAlert
                issues={rest}
                products={knownProducts}
              />
            )}
          </div>
        </ReportSection>
      )}

      {result.alternatives.length > 0 && (
        <ReportSection
          eyebrow="Market comparison"
          title="What else did CEVRA find?"
        >
          <ProductComparison
            alternatives={result.alternatives}
            winnerEffectivePrice={
              result.recommendation?.effectivePrice
                .effectivePrice
            }
            currency={currency}
          />
        </ReportSection>
      )}

      {(() => {
        const distinctWarnings =
          result.warnings.filter(
            (warning) =>
              !primary ||
              warning !==
                primary.result.reasons.join(" "),
          );

        if (distinctWarnings.length === 0) {
          return null;
        }

        return (
          <ReportSection
            eyebrow="Important"
            title="What to watch out for"
          >
            <div className="rounded-2xl border border-decision-avoid/20 bg-decision-avoid-soft p-5 sm:p-6">
              <ul className="flex flex-col gap-3">
                {distinctWarnings.map(
                  (warning, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm leading-6 text-ink"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-decision-avoid"
                      />

                      <span>{warning}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </ReportSection>
        );
      })()}

      <ResearchSources
        products={knownProducts}
        fallbackSources={result.sources}
      />
    </div>
  );
}

function ProductThumbnail({
  product,
}: {
  product: {
    name: string;
    imageUrl?: string;
  };
}) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external retailer URLs are unpredictable
      <img
        src={product.imageUrl}
        alt=""
        className="h-20 w-20 shrink-0 rounded-xl border border-hairline bg-paper object-cover sm:h-24 sm:w-24"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-hairline bg-accent-soft font-serif text-2xl text-accent sm:h-24 sm:w-24"
    >
      {product.name.charAt(0).toUpperCase()}
    </div>
  );
}

function availabilityLabel(
  availability?:
    | "in_stock"
    | "out_of_stock"
    | "unknown",
): string {
  switch (availability) {
    case "in_stock":
      return "In stock";

    case "out_of_stock":
      return "Out of stock";

    default:
      return "Availability unverified";
  }
}

function ReportSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          {eyebrow}
        </p>

        <h2 className="mt-1 font-serif text-2xl tracking-[-0.02em] text-ink">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}