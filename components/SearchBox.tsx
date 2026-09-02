"use client";

import { useState, type FormEvent } from "react";

const MAX_LENGTH = 500;

export function SearchBox({
  onSubmit,
  disabled = false,
  placeholder = "Find the best gaming laptop under $1,500 CAD",
  ctaLabel = "Find the best deal",
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
    if (trimmed.length < 3) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 border-b-2 border-ink py-2 transition-colors focus-within:border-accent">
        <label htmlFor="shopping-buddy-query" className="sr-only">
          What are you looking for?
        </label>
        <input
          id="shopping-buddy-query"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full truncate bg-transparent text-lg placeholder:text-ink-muted focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || value.trim().length < 3}
        className="shrink-0 bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {ctaLabel} →
      </button>
    </form>
  );
}
