"use client";

import { useEffect, useMemo, useState } from "react";

import { sampleMaterials } from "@/lib/samples";
import { deleteMaterial, listMaterials, seedIfEmpty, subscribe } from "@/lib/storage";
import { LEVEL_LABEL, LEVEL_ORDER, type LevelKey, type Material } from "@/lib/types";
import { MaterialCard } from "@/components/MaterialCard";
import { LinkButton } from "@/components/ui";

export function Bookshelf() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [filter, setFilter] = useState<LevelKey | "all">("all");

  useEffect(() => {
    seedIfEmpty(sampleMaterials());
    const sync = () => setMaterials(listMaterials());
    sync();
    return subscribe(sync);
  }, []);

  const levels = useMemo(() => {
    if (!materials) return [];
    const present = new Set(materials.map((m) => m.level));
    return LEVEL_ORDER.filter((l) => present.has(l));
  }, [materials]);

  const shown = useMemo(() => {
    if (!materials) return [];
    return filter === "all" ? materials : materials.filter((m) => m.level === filter);
  }, [materials, filter]);

  function handleDelete(id: string) {
    const target = materials?.find((m) => m.id === id);
    const label = target ? `「${target.title}」` : "この教材";
    if (!window.confirm(`${label}を削除します。進捗と弱点の記録も一緒に消えます。`)) {
      return;
    }
    deleteMaterial(id);
  }

  if (materials === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">まだ教材がありません。</p>
        <div className="mt-4">
          <LinkButton href="/">英文を貼って作る</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {levels.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            すべて（{materials.length}）
          </FilterChip>
          {levels.map((level) => (
            <FilterChip
              key={level}
              active={filter === level}
              onClick={() => setFilter(level)}
            >
              {LEVEL_LABEL[level]}（{materials.filter((m) => m.level === level).length}）
            </FilterChip>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((m) => (
          <MaterialCard key={m.id} material={m} onDelete={handleDelete} />
        ))}
      </div>
    </>
  );
}

function FilterChip({
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
