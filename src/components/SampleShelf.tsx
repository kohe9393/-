"use client";

import { useEffect, useState } from "react";

import { sampleMaterials } from "@/lib/samples";
import { seedIfEmpty } from "@/lib/storage";
import type { Material } from "@/lib/types";
import { MaterialCard } from "@/components/MaterialCard";

/**
 * サンプル教材の一覧。本棚が空なら初回に localStorage へ流し込む。
 * （サンプルにも進捗・弱点マークを付けられるようにするため）
 */
export function SampleShelf() {
  const [samples, setSamples] = useState<Material[]>([]);

  useEffect(() => {
    const list = sampleMaterials();
    seedIfEmpty(list);
    setSamples(list);
  }, []);

  if (samples.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {samples.map((m) => (
        <MaterialCard key={m.id} material={m} />
      ))}
    </div>
  );
}
