import Link from "next/link";

const NAV = [
  { href: "/", label: "教材をつくる" },
  { href: "/bookshelf", label: "本棚" },
  { href: "/weakness", label: "弱点" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight whitespace-nowrap"
        >
          <span
            aria-hidden
            className="inline-block h-5 w-5 rounded-[6px] bg-brand-600"
          />
          Script Flow
        </Link>
        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-2.5 py-1.5 whitespace-nowrap text-[var(--text-muted)] transition-colors hover:bg-ink-100 hover:text-[var(--text)] sm:px-3 dark:hover:bg-ink-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
