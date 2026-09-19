"use client";

import type { Material, Progress, WeaknessMark } from "./types";
import { emptyProgress } from "./types";

const KEY_MATERIALS = "scriptflow.materials.v1";
const KEY_PROGRESS = "scriptflow.progress.v1";
const KEY_MARKS = "scriptflow.marks.v1";

/** localStorage 変更をタブ内の購読者に知らせる。 */
const EVENT = "scriptflow:store";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  } catch (err) {
    // 容量超過など。教材が大きいときに起こりうるので黙って落とさず知らせる。
    console.error("[scriptflow] 保存に失敗しました", err);
    throw err;
  }
}

export function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/* ---------------- 教材（本棚） ---------------- */

export function listMaterials(): Material[] {
  return read<Material[]>(KEY_MATERIALS, []).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export function getMaterial(id: string): Material | undefined {
  return read<Material[]>(KEY_MATERIALS, []).find((m) => m.id === id);
}

export function saveMaterial(material: Material): void {
  const all = read<Material[]>(KEY_MATERIALS, []);
  const i = all.findIndex((m) => m.id === material.id);
  if (i >= 0) all[i] = material;
  else all.unshift(material);
  write(KEY_MATERIALS, all);
}

export function deleteMaterial(id: string): void {
  write(
    KEY_MATERIALS,
    read<Material[]>(KEY_MATERIALS, []).filter((m) => m.id !== id),
  );
  write(
    KEY_PROGRESS,
    read<Progress[]>(KEY_PROGRESS, []).filter((p) => p.materialId !== id),
  );
  write(
    KEY_MARKS,
    read<WeaknessMark[]>(KEY_MARKS, []).filter((w) => w.materialId !== id),
  );
}

/* ---------------- 進捗 ---------------- */

export function getProgress(materialId: string): Progress {
  return (
    read<Progress[]>(KEY_PROGRESS, []).find((p) => p.materialId === materialId) ??
    emptyProgress(materialId)
  );
}

export function saveProgress(progress: Progress): void {
  const all = read<Progress[]>(KEY_PROGRESS, []);
  const i = all.findIndex((p) => p.materialId === progress.materialId);
  const next = { ...progress, updatedAt: Date.now() };
  if (i >= 0) all[i] = next;
  else all.push(next);
  write(KEY_PROGRESS, all);
}

export function allProgress(): Progress[] {
  return read<Progress[]>(KEY_PROGRESS, []);
}

/* ---------------- 弱点マーク ---------------- */

export function listMarks(materialId?: string): WeaknessMark[] {
  const all = read<WeaknessMark[]>(KEY_MARKS, []);
  const filtered = materialId
    ? all.filter((w) => w.materialId === materialId)
    : all;
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export function saveMark(mark: WeaknessMark): void {
  const all = read<WeaknessMark[]>(KEY_MARKS, []);
  const i = all.findIndex((w) => w.id === mark.id);
  if (i >= 0) all[i] = mark;
  else all.unshift(mark);
  write(KEY_MARKS, all);
}

export function deleteMark(id: string): void {
  write(
    KEY_MARKS,
    read<WeaknessMark[]>(KEY_MARKS, []).filter((w) => w.id !== id),
  );
}

/** 本棚が空のときにサンプル教材を流し込む。初回のみ。 */
export function seedIfEmpty(samples: Material[]): void {
  if (typeof window === "undefined") return;
  const seeded = window.localStorage.getItem("scriptflow.seeded.v1");
  if (seeded) return;
  const existing = read<Material[]>(KEY_MATERIALS, []);
  const ids = new Set(existing.map((m) => m.id));
  const merged = [...existing, ...samples.filter((s) => !ids.has(s.id))];
  write(KEY_MATERIALS, merged);
  window.localStorage.setItem("scriptflow.seeded.v1", "1");
}
