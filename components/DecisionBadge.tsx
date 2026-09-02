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

const COLOR: Record<Decision, { fg: string; soft: string }> = {
  BUY: { fg: "text-decision-buy", soft: "bg-decision-buy-soft" },
  WAIT: { fg: "text-decision-wait", soft: "bg-decision-wait-soft" },
  SKIP: { fg: "text-decision-skip", soft: "bg-decision-skip-soft" },
  AVOID: { fg: "text-decision-avoid", soft: "bg-decision-avoid-soft" },
  UNKNOWN: { fg: "text-decision-unknown", soft: "bg-decision-unknown-soft" },
};

/**
 * A small hand-drawn glyph per decision, distinct in SHAPE (not only
 * color), so the state reads even without color vision: a filled circle
 * with a check (go), a filled circle with an X (stop), an outlined circle
 * with a pause bar (hold), an outlined circle with a skip chevron, and a
 * dashed outline with a question mark (not enough evidence).
 */
function DecisionGlyph({ decision, size }: { decision: Decision; size: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;

  switch (decision) {
    case "BUY":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" className="fill-decision-buy" />
          <path
            d="M7.5 12.5l3 3 6-6.5"
            fill="none"
            stroke="var(--surface)"
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
            stroke="var(--surface)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "WAIT":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.25" fill="none" className="stroke-decision-wait" strokeWidth="1.5" />
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
          <circle cx="12" cy="12" r="9.25" fill="none" className="stroke-decision-skip" strokeWidth="1.5" />
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

export function DecisionBadge({ decision, size = "lg" }: { decision: Decision; size?: "sm" | "lg" }) {
  const color = COLOR[decision];
  const glyphSize = size === "lg" ? 40 : 22;
  const textSize = size === "lg" ? "text-3xl" : "text-base";

  return (
    <div className={`inline-flex shrink-0 items-center gap-3 self-start rounded-full py-1.5 pl-1.5 pr-4 ${color.soft}`}>
      <DecisionGlyph decision={decision} size={glyphSize} />
      <span className={`font-sans font-semibold tracking-tight ${textSize} ${color.fg}`}>
        {LABEL[decision]}
      </span>
    </div>
  );
}
