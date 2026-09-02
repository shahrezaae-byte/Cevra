import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-lg tracking-tight text-ink">
          Shopping Buddy
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-muted">
          <Link href="/shop" className="transition-colors hover:text-ink">
            Shop
          </Link>
          <Link href="/analyze" className="transition-colors hover:text-ink">
            Compatibility
          </Link>
        </nav>
      </div>
    </header>
  );
}
