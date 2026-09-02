"use client";

import { useRouter } from "next/navigation";
import { SearchBox } from "@/components/SearchBox";

const EXAMPLES = [
  "Best RTX 5070 deal",
  "MacBook Air under $1,200",
  "AirPods under $200",
  "Gaming PC under $1,500",
];

export default function Home() {
  const router = useRouter();

  function handleSubmit(query: string) {
    router.push(`/shop?query=${encodeURIComponent(query)}`);
  }

  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto w-full max-w-2xl px-6 py-20">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="font-serif text-5xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Don&apos;t overpay.
            <br />
            Ask first.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-muted">
            Tell us what you&apos;re looking for. We&apos;ll research the market and tell you what
            to buy.
          </p>
        </div>

        <div className="mt-10">
          <SearchBox onSubmit={handleSubmit} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
          <span className="text-sm text-ink-muted">Try asking</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => handleSubmit(example)}
              className="border border-hairline px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
