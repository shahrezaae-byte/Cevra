import type { Verdict } from "@/types/recommendation";
import type { PurchaseDecision } from "@/lib/decision/purchaseDecision";

export type Decision = Verdict | PurchaseDecision;

const LABEL: Record<Decision, string> = {
  BUY: "Buy",
  WAIT: "Wait",
  SKIP: "Skip",
  AVOID: "Avoid",
  UNKNOWN: "Unknown",
};

const COLOR: Record<Decision, { fg: string; soft: string; border: string }> = {
  BUY: {
    fg: "text-decision-buy",
    soft: "bg-decision-buy-soft",
    border: "border-decision-buy/25",
  },
  WAIT: {
    fg: "text-decision-wait",
    soft: "bg-decision-wait-soft",
    border: "border-decision-wait/25",
  },
  SKIP: {
    fg: "text-decision-skip",
    soft: "bg-decision-skip-soft",
    border: "border-decision-skip/25",
  },
  AVOID: {
    fg: "text-decision-avoid",
    soft: "bg-decision-avoid-soft",
    border: "border-decision-avoid/25",
  },
  UNKNOWN: {
    fg: "text-decision-unknown",
    soft: "bg-decision-unknown-soft",
    border: "border-decision-unknown/25",
  },
};

function DecisionGlyph({
  decision,
  size,
}: {
  decision: Decision;
  size: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  } as const;

  switch (decision) {
    case "BUY":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" className="fill-decision-buy" />
          <path
            d="M7.5 12.5l3 3 6-6.5"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "AVOID":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" className="fill-decision-avoid" />
          <path
            d="M8.5 8.5l7 7M15.5 8.5l-7 7"
            stroke="var(--paper)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "WAIT":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9.25"
            fill="none"
            className="stroke-decision-wait"
            strokeWidth="1.5"
          />
          <path
            d="M9.5 8.5v7M14.5 8.5v7"
            className="stroke-decision-wait"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "SKIP":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9.25"
            fill="none"
            className="stroke-decision-skip"
            strokeWidth="1.5"
          />
          <path
            d="M9 8l4 4-4 4M14 8l4 4-4 4"
            fill="none"
            className="stroke-decision-skip"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "UNKNOWN":
    default:
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9.25"
            fill="none"
            className="stroke-decision-unknown"
            strokeWidth="1.5"
            strokeDasharray="2.5 2.5"
          />
          <text
            x="12"
            y="16.5"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="12"
            className="fill-decision-unknown"
          >
            ?
          </text>
        </svg>
      );
  }
}

export function DecisionBadge({
  decision,
  size = "lg",
}: {
  decision: Decision;
  size?: "sm" | "lg";
}) {
  const color = COLOR[decision];

  if (size === "sm") {
    return (
      <div
        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 ${color.soft} ${color.border}`}
      >
        <DecisionGlyph decision={decision} size={18} />

        <span
          className={`text-sm font-semibold tracking-[-0.01em] ${color.fg}`}
        >
          {LABEL[decision]}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-3 rounded-full border px-3 py-2 ${color.soft} ${color.border}`}
    >
      <DecisionGlyph decision={decision} size={28} />

      <div className="pr-1">
        <span
          className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${color.fg}`}
        >
          CEVRA verdict
        </span>

        <span
          className={`block font-sans text-2xl font-semibold leading-none tracking-[-0.025em] ${color.fg}`}
        >
          {LABEL[decision]}
        </span>
      </div>
    </div>
  );
}