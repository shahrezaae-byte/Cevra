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
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-ink-muted">
              CEVRA
            </p>
          </div>

          <h1 className="font-serif text-5xl leading-[1.02] tracking-[-0.03em] text-ink sm:text-7xl">
            Don&apos;t overpay.
            <br />
            <span className="text-ink-muted">Ask first.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
            CEVRA researches real listings, compares the market, and gives you
            one clear answer before you buy.
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <SearchBox onSubmit={handleSubmit} />
          </div>

          <div className="mt-7">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              Try asking CEVRA
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => handleSubmit(example)}
                  className="border border-hairline bg-white/40 px-4 py-2 text-sm text-ink-muted transition-all duration-200 hover:border-ink hover:bg-white hover:text-ink"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-3xl border-y border-hairline py-8">
          <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-4">
            <div>
              <p className="font-serif text-xl text-ink">Research</p>
              <p className="mt-1 text-sm text-ink-muted">
                Real listings, not guesses.
              </p>
            </div>

            <div className="border-y border-hairline py-6 sm:border-x sm:border-y-0 sm:py-0">
              <p className="font-serif text-xl text-ink">Compare</p>
              <p className="mt-1 text-sm text-ink-muted">
                See what the market says.
              </p>
            </div>

            <div>
              <p className="font-serif text-xl text-ink">Decide</p>
              <p className="mt-1 text-sm text-ink-muted">
                BUY, WAIT, SKIP, or AVOID.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}