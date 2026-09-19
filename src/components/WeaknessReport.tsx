"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { deleteMark, listMarks, saveMark, subscribe } from "@/lib/storage";
import {
  WEAKNESS_LABEL,
  type WeaknessKind,
  type WeaknessMark,
} from "@/lib/types";
import { MarkCard } from "@/components/MarkCard";
import { Notice } from "@/components/ui";

const KINDS: WeaknessKind[] = ["listening", "vocab", "grammar"];

const BAR_TONE: Record<WeaknessKind, string> = {
  listening: "bg-sky-500",
  vocab: "bg-violet-500",
  grammar: "bg-amber-500",
};

export function WeaknessReport() {
  const [marks, setMarks] = useState<WeaknessMark[] | null>(null);
  const [filter, setFilter] = useState<WeaknessKind | "all">("all");
  const [hideResolved, setHideResolved] = useState(false);

  useEffect(() => {
    const sync = () => setMarks(listMarks());
    sync();
    return subscribe(sync);
  }, []);

  const counts = useMemo(() => {
    const base: Record<WeaknessKind, number> = {
      listening: 0,
      vocab: 0,
      grammar: 0,
    };
    for (const m of marks ?? []) base[m.kind] += 1;
    return base;
  }, [marks]);

  const shown = useMemo(() => {
    let list = marks ?? [];
    if (filter !== "all") list = list.filter((m) => m.kind === filter);
    if (hideResolved) list = list.filter((m) => !m.resolved);
    return list;
  }, [marks, filter, hideResolved]);

  if (marks === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    );
  }

  if (marks.length === 0) {
    return (
      <Notice tone="info">
        まだ記録がありません。学習画面で分からない箇所に印を付けると、ここに集まります。
        <Link
          href="/bookshelf"
          className="ml-1 underline underline-offset-4"
        >
          本棚へ
        </Link>
      </Notice>
    );
  }

  const total = marks.length;
  const top = KINDS.reduce((a, b) => (counts[a] >= counts[b] ? a : b));

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">つまずきの内訳</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          全 {total} 件のうち、いちばん多いのは
          <strong className="mx-1 font-medium text-[var(--text)]">
            {WEAKNESS_LABEL[top]}
          </strong>
          です。
        </p>
        <dl className="mt-4 space-y-3">
          {KINDS.map((kind) => (
            <div key={kind}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <dt>{WEAKNESS_LABEL[kind]}</dt>
                <dd className="tabular-nums text-[var(--text-muted)]">
                  {counts[kind]} 件
                </dd>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                <div
                  className={`h-full rounded-full ${BAR_TONE[kind]} transition-[width] duration-500`}
                  style={{ width: `${total ? (counts[kind] / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          すべて
        </Chip>
        {KINDS.map((kind) => (
          <Chip
            key={kind}
            active={filter === kind}
            onClick={() => setFilter(kind)}
          >
            {WEAKNESS_LABEL[kind]}
          </Chip>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-muted)] select-none">
          <input
            type="checkbox"
            checked={hideResolved}
            onChange={(e) => setHideResolved(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-brand-600)]"
          />
          解決済みを隠す
        </label>
      </div>

      {shown.length === 0 ? (
        <Notice tone="info">条件に合う記録がありません。</Notice>
      ) : (
        <div className="space-y-4">
          {shown.map((mark) => (
            <MarkCard
              key={mark.id}
              mark={mark}
              showMaterial
              onRetry={(m) => {
                // この画面では教材の前後文が手元にないので、対象の文だけで解説を取り直す
                const pending = { ...m, status: "loading" as const, errorMessage: "" };
                saveMark(pending);
                void retry(pending);
              }}
              onResolve={(m) => saveMark({ ...m, resolved: !m.resolved })}
              onDelete={(m) => deleteMark(m.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** 解説の取り直し。状態は saveMark → 購読の経路だけで更新する。 */
async function retry(mark: WeaknessMark) {
  const apply = saveMark;
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: mark.kind,
        sentence: mark.sentenceEn,
        sentenceJa: mark.sentenceJa,
        selectedText: mark.selectedText,
        contextBefore: "",
        contextAfter: "",
      }),
    });
    const data = await res.json();
    apply(
      res.ok && data.explanation
        ? { ...mark, status: "done", explanation: data.explanation, errorMessage: "" }
        : {
            ...mark,
            status: "error",
            errorMessage: data.error ?? "解説を取得できませんでした。",
          },
    );
  } catch {
    apply({
      ...mark,
      status: "error",
      errorMessage: "サーバーに接続できませんでした。",
    });
  }
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900"
          : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
