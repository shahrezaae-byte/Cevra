"use client";

const STAGES = [
  "Understanding request",
  "Finding listings",
  "Comparing prices",
  "Checking compatibility",
  "Making recommendation",
];

/**
 * A single request/response call underlies this (no server-sent progress
 * events), so we never claim a stage is verified complete — there's no
 * checkmark asserting "done." The current stage pulses; passed stages sit
 * in plain ink to show forward motion, not confirmation. The one thing
 * that's actually true — the whole thing finishing — is communicated by
 * this component unmounting and the real result appearing, not by a fake
 * final checkmark here.
 */
export function ResearchProgress({ stageIndex }: { stageIndex: number }) {
  const clamped = Math.min(stageIndex, STAGES.length - 1);

  return (
    <div className="border border-hairline bg-surface px-8 py-7">
      <ul className="flex flex-col gap-3.5">
        {STAGES.map((stage, i) => {
          const current = i === clamped;
          const passed = i < clamped;
          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                  current ? "animate-pulse bg-accent" : passed ? "bg-accent" : "bg-hairline"
                }`}
              />
              <span className={`text-sm transition-colors ${current || passed ? "text-ink" : "text-ink-muted"}`}>
                {stage}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
