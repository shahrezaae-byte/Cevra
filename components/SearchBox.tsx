"use client";

import { useState, type FormEvent } from "react";

const MAX_LENGTH = 500;

export function SearchBox({
  onSubmit,
  disabled = false,
  placeholder = "What are you thinking about buying?",
  ctaLabel = "Research",
}: {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ctaLabel?: string;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = value.trim();

    if (trimmed.length < 3 || disabled) return;

    onSubmit(trimmed);
  }

  const canSubmit = value.trim().length >= 3 && !disabled;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={[
          "group relative overflow-hidden rounded-2xl border bg-surface",
          "transition-all duration-200",
          "focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30",
          disabled ? "opacity-60" : "border-hairline",
        ].join(" ")}
      >
        <label htmlFor="cevra-query" className="sr-only">
          What are you looking to buy?
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center px-5 py-4 sm:px-6 sm:py-5">
            <span
              aria-hidden="true"
              className="mr-3 hidden text-sm text-ink-muted sm:block"
            >
              →
            </span>

            <input
              id="cevra-query"
              type="text"
              value={value}
              onChange={(e) =>
                setValue(e.target.value.slice(0, MAX_LENGTH))
              }
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted sm:text-lg"
            />

            {value.length > 0 && (
              <span className="ml-3 hidden text-xs tabular text-ink-muted sm:block">
                {value.length}/{MAX_LENGTH}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "m-2 rounded-xl px-5 py-3 text-sm font-semibold",
              "transition-all duration-200",
              "sm:m-2.5 sm:px-6 sm:py-3.5",
              canSubmit
                ? "bg-ink text-paper hover:opacity-85 active:scale-[0.98]"
                : "cursor-not-allowed bg-hairline text-ink-muted",
            ].join(" ")}
          >
            {disabled ? "Researching…" : `${ctaLabel} →`}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-xs text-ink-muted">
        <span>
          Ask about a product, price, budget, or compatibility.
        </span>

        <span className="hidden sm:block">CEVRA researches before you buy.</span>
      </div>
    </form>
  );
}