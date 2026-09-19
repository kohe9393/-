"use client";

import Link from "next/link";

import {
  WEAKNESS_LABEL,
  WEAKNESS_SHORT,
  type WeaknessKind,
  type WeaknessMark,
} from "@/lib/types";

const KIND_TONE: Record<WeaknessKind, string> = {
  listening: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  vocab: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  grammar: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
};

export function MarkCard({
  mark,
  showMaterial = false,
  onRetry,
  onResolve,
  onDelete,
}: {
  mark: WeaknessMark;
  showMaterial?: boolean;
  onRetry: (mark: WeaknessMark) => void;
  onResolve: (mark: WeaknessMark) => void;
  onDelete: (mark: WeaknessMark) => void;
}) {
  return (
    <article
      id={`mark-${mark.id}`}
      className={`scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${
        mark.resolved ? "opacity-60" : ""
      }`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${KIND_TONE[mark.kind]}`}
        >
          {WEAKNESS_LABEL[mark.kind]}
        </span>
        {showMaterial && (
          <Link
            href={`/study/${mark.materialId}#sentence-${mark.sentenceId}`}
            className="text-xs text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
          >
            {mark.materialTitle}
          </Link>
        )}
        {mark.resolved && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            解決済み
          </span>
        )}
        <time className="ml-auto text-xs text-[var(--text-muted)]">
          {new Date(mark.createdAt).toLocaleDateString("ja-JP")}
        </time>
      </header>

      <blockquote className="rounded-xl bg-[var(--surface-muted)] p-4">
        <p className="reading-en text-[15px] leading-7">
          {mark.selectedText ? (
            <Highlight text={mark.sentenceEn} target={mark.selectedText} />
          ) : (
            mark.sentenceEn
          )}
        </p>
        {mark.sentenceJa && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{mark.sentenceJa}</p>
        )}
      </blockquote>

      <div className="mt-4">
        {mark.status === "loading" && (
          <p className="animate-pulse text-sm text-[var(--text-muted)]">
            {WEAKNESS_SHORT[mark.kind]}の観点で解説を書いています…
          </p>
        )}

        {mark.status === "idle" && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <p className="min-w-0 flex-1">
              {mark.errorMessage || "解説はまだ取得していません。"}
            </p>
            <button
              type="button"
              onClick={() => onRetry(mark)}
              className="underline underline-offset-4 hover:text-[var(--text)]"
            >
              解説を取得
            </button>
          </div>
        )}

        {mark.status === "error" && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            <p>{mark.errorMessage || "解説を取得できませんでした。"}</p>
            <button
              type="button"
              onClick={() => onRetry(mark)}
              className="mt-2 underline underline-offset-4"
            >
              もう一度試す
            </button>
          </div>
        )}

        {mark.status === "done" && mark.explanation && (
          <div className="space-y-3">
            <p className="font-medium">{mark.explanation.headline}</p>
            <p className="text-sm leading-7 whitespace-pre-line text-[var(--text-muted)]">
              {mark.explanation.explanation}
            </p>
            {mark.explanation.keyPoints.length > 0 && (
              <ul className="space-y-1.5">
                {mark.explanation.keyPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-brand-500">▸</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
            {mark.explanation.relatedExample && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="mb-1 text-xs text-[var(--text-muted)]">似た形の例文</p>
                <p className="reading-en text-sm leading-7">
                  {mark.explanation.relatedExample}
                </p>
                {mark.explanation.relatedExampleJa && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {mark.explanation.relatedExampleJa}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 text-xs">
        <button
          type="button"
          onClick={() => onResolve(mark)}
          className="text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          {mark.resolved ? "未解決に戻す" : "わかった"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(mark)}
          className="ml-auto text-[var(--text-muted)] transition-colors hover:text-rose-600"
        >
          削除
        </button>
      </footer>
    </article>
  );
}

/** 選択された箇所を本文中でハイライトする。 */
function Highlight({ text, target }: { text: string; target: string }) {
  const at = text.indexOf(target);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-brand-100 px-0.5 text-inherit dark:bg-brand-700/40">
        {target}
      </mark>
      {text.slice(at + target.length)}
    </>
  );
}
