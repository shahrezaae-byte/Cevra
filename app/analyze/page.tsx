"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DecisionBadge } from "@/components/DecisionBadge";
import { CompatibilityAlert } from "@/components/CompatibilityAlert";
import { CompatibilityShowdown } from "@/components/CompatibilityShowdown";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ProductComparison } from "@/components/ProductComparison";
import { ResearchProgress } from "@/components/ResearchProgress";
import { ResearchSources } from "@/components/ResearchSources";
import { pickPrimaryIssue } from "@/components/pickPrimaryIssue";
import type { AnalysisResult, PriceAssessmentLabel } from "@/types/recommendation";

type LoadState =
  | { status: "loading"; stage: number }
  | { status: "http-error"; message: string }
  | { status: "done"; result: AnalysisResult };

const FIELDS: { key: keyof PartsFormValues; label: string; placeholder: string }[] = [
  { key: "cpu", label: "CPU", placeholder: "Intel Core i9-14900K" },
  { key: "motherboard", label: "Motherboard", placeholder: "ASRock B550M-HDV" },
  { key: "ram", label: "RAM", placeholder: "32GB DDR4" },
  { key: "gpu", label: "GPU", placeholder: "RTX 4070" },
  { key: "psu", label: "PSU", placeholder: "Corsair RM750" },
  { key: "storage", label: "Storage", placeholder: "1TB NVMe SSD" },
];

interface PartsFormValues {
  cpu: string;
  motherboard: string;
  ram: string;
  gpu: string;
  psu: string;
  storage: string;
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <AnalyzePageContent />
    </Suspense>
  );
}

function AnalyzePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const request = searchParams.get("request") ?? "";

  if (!request) {
    return <InspectorForm onSubmit={(r) => router.push(`/analyze?request=${encodeURIComponent(r)}`)} />;
  }

  return <InspectorReport key={request} request={request} />;
}

function InspectorForm({ onSubmit }: { onSubmit: (request: string) => void }) {
  const [fields, setFields] = useState<PartsFormValues>({
    cpu: "",
    motherboard: "",
    ram: "",
    gpu: "",
    psu: "",
    storage: "",
  });
  const [freeform, setFreeform] = useState("");
  const [useFreeform, setUseFreeform] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const composed = useFreeform ? freeform.trim() : buildRequestFromParts(fields);
    if (composed.length < 3) return;
    onSubmit(composed);
  }

  const hasAnyPart = Object.values(fields).some((v) => v.trim().length > 0);
  const canSubmit = useFreeform ? freeform.trim().length >= 3 : hasAnyPart;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <p className="text-sm text-ink-muted">Compatibility</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-ink">
          PC Compatibility Inspector
        </h1>
        <p className="mt-3 max-w-md leading-relaxed text-ink-muted">
          Enter the parts you&apos;re checking. Sockets, memory generation, and power draw are
          verified deterministically — never guessed by the AI.
        </p>

        {!useFreeform ? (
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5 border-b border-hairline pb-2">
                  <label htmlFor={key} className="text-xs text-ink-muted">
                    {label}
                  </label>
                  <input
                    id={key}
                    type="text"
                    value={fields[key]}
                    onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value.slice(0, 120) }))}
                    placeholder={placeholder}
                    className="bg-transparent text-base placeholder:text-ink-muted/60 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setUseFreeform(true)}
                className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                Or describe it in plain English
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="shrink-0 bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check compatibility →
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4">
            <div className="border-b-2 border-ink py-2 transition-colors focus-within:border-accent">
              <label htmlFor="freeform" className="sr-only">
                Describe what you&apos;re checking
              </label>
              <input
                id="freeform"
                type="text"
                value={freeform}
                onChange={(e) => setFreeform(e.target.value.slice(0, 500))}
                placeholder="I have an i9-14900K and a B550M-HDV. I want to buy RAM."
                className="w-full truncate bg-transparent text-lg placeholder:text-ink-muted focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setUseFreeform(false)}
                className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                Use part fields instead
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="shrink-0 bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check compatibility →
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function buildRequestFromParts(fields: PartsFormValues): string {
  const lines = FIELDS.filter(({ key }) => fields[key].trim().length > 0).map(
    ({ key, label }) => `${label}: ${fields[key].trim()}`
  );
  if (lines.length === 0) return "";
  return `${lines.join(". ")}. Check compatibility and tell me what to buy next.`;
}

function InspectorReport({ request }: { request: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading", stage: 0 });

  useEffect(() => {
    let cancelled = false;
    const stageTimer = setInterval(() => {
      setState((prev) =>
        prev.status === "loading" && prev.stage < 4 ? { status: "loading", stage: prev.stage + 1 } : prev
      );
    }, 700);

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request }),
        });
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState({ status: "http-error", message: body.error ?? "Something went wrong." });
          return;
        }
        setState({ status: "done", result: body as AnalysisResult });
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
  }, [request]);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <button
          onClick={() => router.push("/analyze")}
          className="mb-8 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          ← New check
        </button>

        <p className="mb-8 font-serif text-xl italic text-ink-muted">&ldquo;{request}&rdquo;</p>

        {state.status === "loading" && <ResearchProgress stageIndex={state.stage} />}
        {state.status === "http-error" && <UnavailableNotice message={state.message} />}
        {state.status === "done" && <InspectorResult result={state.result} />}
      </div>
    </main>
  );
}

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

function InspectorResult({ result }: { result: AnalysisResult }) {
  const { primary, rest } = pickPrimaryIssue(result.compatibilityIssues, result.bestChoice?.product.id);
  const knownProducts = [
    ...(result.bestChoice ? [result.bestChoice.product] : []),
    ...result.alternatives.map((a) => a.product),
  ];

  return (
    <div className="flex flex-col gap-12">
      {primary && (
        <section>
          <CompatibilityShowdown issue={primary} products={knownProducts} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <DecisionBadge decision={result.verdict} />
        <h1 className="max-w-md font-serif text-2xl leading-snug text-ink">{result.headline}</h1>
      </section>

      {(() => {
        const distinctNotices = result.warnings.filter(
          (w) => !primary || w !== primary.result.reasons.join(" ")
        );
        return (
          !result.researchAvailable &&
          distinctNotices.length > 0 && (
            <Section label="Notice">
              <ul className="flex flex-col gap-2">
                {distinctNotices.map((w, i) => (
                  <li key={i} className="text-sm text-ink-muted">
                    {w}
                  </li>
                ))}
              </ul>
            </Section>
          )
        );
      })()}

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

      {rest.length > 0 && (
        <Section label="Compatibility">
          <CompatibilityAlert issues={rest} products={knownProducts} />
        </Section>
      )}

      {result.bestChoice && (
        <Section label="Best choice">
          <RecommendationCard product={result.bestChoice.product} reason={result.bestChoice.reason} />
        </Section>
      )}

      {result.researchAvailable && (
        <Section label="Price assessment">
          <p className="text-sm leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">{priceAssessmentLabel(result.priceAssessment.assessment)}.</span>{" "}
            {result.priceAssessment.reason}
          </p>
        </Section>
      )}

      {result.alternatives.length > 0 && (
        <Section label="Alternatives">
          <ProductComparison alternatives={result.alternatives} />
        </Section>
      )}

      {(() => {
        const distinctWarnings = result.warnings.filter(
          (w) => !primary || w !== primary.result.reasons.join(" ")
        );
        return (
          distinctWarnings.length > 0 &&
          result.researchAvailable && (
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

function priceAssessmentLabel(label: PriceAssessmentLabel): string {
  switch (label) {
    case "GREAT":
      return "Great price";
    case "GOOD":
      return "Good price";
    case "FAIR":
      return "Fair price";
    case "POOR":
      return "Poor price";
    case "UNKNOWN":
    default:
      return "Price unverified";
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
