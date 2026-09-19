"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getProgress, subscribe } from "@/lib/storage";
import type { Material } from "@/lib/types";
import { LevelBadge, ProgressBar } from "@/components/ui";

export function MaterialCard({
  material,
  onDelete,
}: {
  material: Material;
  onDelete?: (id: string) => void;
}) {
  const [read, setRead] = useState(0);

  useEffect(() => {
    const sync = () => setRead(getProgress(material.id).readSentenceIds.length);
    sync();
    return subscribe(sync);
  }, [material.id]);

  const total = material.sentences.length;
  const ratio = total > 0 ? read / total : 0;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-md">
      <Link href={`/study/${material.id}`} className="flex-1">
        <div className="mb-2 flex items-start gap-2">
          <LevelBadge level={material.level} />
          {material.source === "sample" && (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              サンプル
            </span>
          )}
          {!material.aiGenerated && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              対訳なし
            </span>
          )}
        </div>
        <h3 className="reading-en text-lg leading-snug font-semibold tracking-tight">
          {material.title}
        </h3>
        {material.titleJa && (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{material.titleJa}</p>
        )}
        {material.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
            {material.summary}
          </p>
        )}
      </Link>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            {material.wordCount} 語 · {total} 文 · パート{material.parts.length}
          </span>
          <span>
            音読 {read}/{total}
          </span>
        </div>
        <ProgressBar value={ratio} />
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(material.id)}
          className="absolute top-3 right-3 rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-700 focus:opacity-100 dark:hover:bg-rose-950/60 dark:hover:text-rose-300"
          aria-label={`${material.title} を削除`}
        >
          削除
        </button>
      )}
    </div>
  );
}
