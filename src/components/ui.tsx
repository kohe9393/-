import Link from "next/link";

import { LEVEL_LABEL, type LevelKey } from "@/lib/types";

/** レベルごとに色を変えたバッジ。 */
export function LevelBadge({ level }: { level: LevelKey }) {
  const tone: Record<LevelKey, string> = {
    eiken3: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    kyotsu: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    eiken2: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    toeic: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
    toefl: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    unknown: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[level]}`}
    >
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-ink-800 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
    >
      {children}
    </Link>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-700/15 dark:text-brand-200",
    warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    error:
      "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>
  );
}

/** 進捗バー。0〜1。 */
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
