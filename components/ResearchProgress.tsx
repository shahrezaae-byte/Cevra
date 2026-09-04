"use client";

const STAGES = [
  "Understanding request",
  "Finding listings",
  "Comparing prices",
  "Checking compatibility",
  "Making recommendation",
];

export function ResearchProgress({
  stageIndex,
}: {
  stageIndex: number;
}) {
  const clamped = Math.max(
    0,
    Math.min(stageIndex, STAGES.length - 1),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div className="border-b border-hairline px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              CEVRA research
            </p>

            <h2 className="mt-1 font-serif text-xl tracking-[-0.015em] text-ink">
              Researching your request
            </h2>
          </div>

          <span className="tabular text-xs text-ink-muted">
            {clamped + 1}/{STAGES.length}
          </span>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="mb-6 h-px overflow-hidden bg-hairline">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{
              width: `${((clamped + 1) / STAGES.length) * 100}%`,
            }}
          />
        </div>

        <ul className="flex flex-col">
          {STAGES.map((stage, i) => {
            const current = i === clamped;
            const passed = i < clamped;

            return (
              <li
                key={stage}
                className={[
                  "relative flex min-h-10 items-start gap-4",
                  i < STAGES.length - 1
                    ? "pb-4"
                    : "",
                ].join(" ")}
              >
                {i < STAGES.length - 1 && (
                  <span
                    aria-hidden
                    className={`absolute left-[7px] top-4 h-full w-px ${
                      passed ? "bg-accent/50" : "bg-hairline"
                    }`}
                  />
                )}

                <span
                  aria-hidden
                  className={[
                    "relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border transition-all duration-300",
                    current
                      ? "border-accent bg-accent shadow-[0_0_0_4px_rgba(142,168,255,0.10)]"
                      : passed
                        ? "border-accent bg-accent"
                        : "border-hairline bg-surface",
                  ].join(" ")}
                />

                <div className="min-w-0">
                  <p
                    className={[
                      "text-sm transition-colors duration-300",
                      current || passed
                        ? "font-medium text-ink"
                        : "text-ink-muted",
                    ].join(" ")}
                  >
                    {stage}
                  </p>

                  {current && (
                    <p className="mt-1 text-xs text-ink-muted">
                      Working on this now…
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-hairline px-5 py-3 sm:px-6">
        <p className="text-xs leading-5 text-ink-muted">
          CEVRA is researching current listings before making a recommendation.
        </p>
      </div>
    </div>
  );
}