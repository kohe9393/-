"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { newId } from "@/lib/material";
import {
  deleteMark,
  getMaterial,
  getProgress,
  listMarks,
  saveMark,
  saveProgress,
  seedIfEmpty,
  subscribe,
} from "@/lib/storage";
import { sampleMaterials } from "@/lib/samples";
import type {
  Explanation,
  Material,
  Progress,
  Sentence,
  WeaknessKind,
  WeaknessMark,
} from "@/lib/types";
import { LevelBadge, Notice, ProgressBar } from "@/components/ui";
import { MarkCard } from "@/components/MarkCard";
import { PlayerBar } from "./PlayerBar";
import { SentenceRow } from "./SentenceRow";
import { VocabTab } from "./VocabTab";
import { useReader, type ReaderSettings } from "./useReader";

type Tab = "text" | "vocab" | "weakness";

const TABS: { key: Tab; label: string }[] = [
  { key: "text", label: "本文" },
  { key: "vocab", label: "単語帳" },
  { key: "weakness", label: "弱点" },
];

const SETTINGS_KEY = "scriptflow.reader.v1";

const DEFAULT_SETTINGS: ReaderSettings = {
  rate: 0.9,
  voiceURI: "",
  repeat: 1,
  autoAdvance: true,
  loop: false,
  range: [0, 0],
};

export function StudyView({ id, aiEnabled }: { id: string; aiEnabled: boolean }) {
  const [material, setMaterial] = useState<Material | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [marks, setMarks] = useState<WeaknessMark[]>([]);
  const [tab, setTab] = useState<Tab>("text");
  const [showJa, setShowJa] = useState(true);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  /* ---------- 読み込み ---------- */

  useEffect(() => {
    seedIfEmpty(sampleMaterials());
    const found = getMaterial(id);
    setMaterial(found ?? null);
    if (!found) return;

    const p = getProgress(id);
    const started = { ...p, sessions: p.sessions + 1 };
    saveProgress(started);
    setProgress(started);
    setSettings((s) => ({
      ...s,
      ...readSettings(),
      range: [0, Math.max(0, found.sentences.length - 1)],
    }));

    // 弱点マークは localStorage を唯一の情報源にする。
    // 画面側でも同じ更新を当てると、保存イベント経由の再読み込みと二重に適用されてしまう。
    const sync = () => setMarks(listMarks(id));
    sync();
    return subscribe(sync);
  }, [id]);

  /* ---------- 進捗 ---------- */

  const readSet = useMemo(
    () => new Set(progress?.readSentenceIds ?? []),
    [progress],
  );
  const learnedSet = useMemo(
    () => new Set(progress?.learnedVocabIds ?? []),
    [progress],
  );

  const updateProgress = useCallback((patch: Partial<Progress>) => {
    setProgress((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveProgress(next);
      return next;
    });
  }, []);

  const markRead = useCallback(
    (sentenceId: string, read: boolean) => {
      setProgress((prev) => {
        if (!prev) return prev;
        const set = new Set(prev.readSentenceIds);
        if (read) set.add(sentenceId);
        else set.delete(sentenceId);
        const next = {
          ...prev,
          readSentenceIds: [...set],
          lastSentenceId: sentenceId,
        };
        saveProgress(next);
        return next;
      });
    },
    [],
  );

  /* ---------- プレイヤー ---------- */

  const sentences = material?.sentences ?? [];

  const handleSentenceDone = useCallback(
    (sentence: Sentence) => markRead(sentence.id, true),
    [markRead],
  );

  const reader = useReader(sentences, settings, handleSentenceDone);

  const patchSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  // 再生中の文が画面外なら追いかける
  useEffect(() => {
    if (!reader.playing || tab !== "text") return;
    const current = sentences[reader.index];
    if (!current) return;
    document
      .getElementById(`sentence-${current.id}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [reader.index, reader.playing, tab, sentences]);

  // キーボード操作（入力欄にフォーカスがあるときは無効）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        reader.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        reader.step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        reader.step(-1);
      } else if (e.key === "j" || e.key === "J") {
        setShowJa((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reader]);

  /* ---------- 弱点マーク ---------- */

  const fetchExplanation = useCallback(
    async (mark: WeaknessMark, all: Sentence[]) => {
      const i = all.findIndex((s) => s.id === mark.sentenceId);
      const body = {
        kind: mark.kind,
        sentence: mark.sentenceEn,
        sentenceJa: mark.sentenceJa,
        selectedText: mark.selectedText,
        contextBefore: i > 0 ? all[i - 1].en : "",
        contextAfter: i >= 0 && i + 1 < all.length ? all[i + 1].en : "",
      };
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data: { explanation?: Explanation; error?: string } = await res.json();
        saveMark(
          res.ok && data.explanation
            ? { ...mark, status: "done", explanation: data.explanation, errorMessage: "" }
            : {
                ...mark,
                status: "error",
                errorMessage: data.error ?? "解説を取得できませんでした。",
              },
        );
      } catch {
        saveMark({
          ...mark,
          status: "error",
          errorMessage: "サーバーに接続できませんでした。",
        });
      }
    },
    [],
  );

  const addMark = useCallback(
    (sentence: Sentence, kind: WeaknessKind, selectedText: string) => {
      if (!material) return;
      const mark: WeaknessMark = {
        id: newId("w"),
        materialId: material.id,
        materialTitle: material.title,
        sentenceId: sentence.id,
        sentenceEn: sentence.en,
        sentenceJa: sentence.ja,
        kind,
        selectedText,
        explanation: null,
        status: aiEnabled ? "loading" : "idle",
        errorMessage: aiEnabled
          ? ""
          : "ANTHROPIC_API_KEY を設定すると、この箇所をその場で解説できます。印は記録されています。",
        createdAt: Date.now(),
        resolved: false,
      };
      saveMark(mark);
      if (aiEnabled) void fetchExplanation(mark, material.sentences);
    },
    [material, aiEnabled, fetchExplanation],
  );

  const retryMark = useCallback(
    (mark: WeaknessMark) => {
      if (!material) return;
      const pending: WeaknessMark = { ...mark, status: "loading", errorMessage: "" };
      saveMark(pending);
      void fetchExplanation(pending, material.sentences);
    },
    [material, fetchExplanation],
  );

  const toggleResolved = useCallback((mark: WeaknessMark) => {
    saveMark({ ...mark, resolved: !mark.resolved });
  }, []);

  const removeMark = useCallback((mark: WeaknessMark) => {
    deleteMark(mark.id);
  }, []);

  const marksBySentence = useMemo(() => {
    const map = new Map<string, WeaknessMark[]>();
    for (const m of marks) {
      const list = map.get(m.sentenceId);
      if (list) list.push(m);
      else map.set(m.sentenceId, [m]);
    }
    return map;
  }, [marks]);

  /* ---------- 描画 ---------- */

  if (material === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--surface)]" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (material === null) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-xl font-semibold">教材が見つかりません</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          教材はこのブラウザに保存されます。別のブラウザや端末では開けません。
        </p>
        <Link
          href="/bookshelf"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm text-white hover:bg-brand-700"
        >
          本棚へ戻る
        </Link>
      </div>
    );
  }

  const activePart =
    material.parts.find((p) =>
      p.sentenceIds.includes(sentences[reader.index]?.id ?? ""),
    ) ?? material.parts[0];

  const readCount = readSet.size;
  const unresolved = marks.filter((m) => !m.resolved).length;

  return (
    <div className="pb-4">
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <LevelBadge level={material.level} />
          {material.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="reading-en text-2xl leading-snug font-bold tracking-tight sm:text-3xl">
          {material.title}
        </h1>
        {material.titleJa && (
          <p className="mt-1 text-[var(--text-muted)]">{material.titleJa}</p>
        )}
        {material.summary && (
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            {material.summary}
          </p>
        )}

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              {material.wordCount} 語 · {sentences.length} 文 · パート
              {material.parts.length}
            </span>
            <span>
              音読 {readCount}/{sentences.length}
            </span>
          </div>
          <ProgressBar value={sentences.length ? readCount / sentences.length : 0} />
        </div>

        {material.notice && (
          <div className="mt-5">
            <Notice tone="warn">{material.notice}</Notice>
          </div>
        )}
        {reader.error && (
          <div className="mt-5">
            <Notice tone="error">{reader.error}</Notice>
          </div>
        )}

        <nav className="mt-7 flex items-center gap-1 border-b border-[var(--border)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-selected={tab === t.key}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${
                tab === t.key
                  ? "border-brand-600 font-medium text-[var(--text)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
              {t.key === "vocab" && material.vocab.length > 0 && (
                <span className="ml-1.5 text-xs">{material.vocab.length}</span>
              )}
              {t.key === "weakness" && unresolved > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {unresolved}
                </span>
              )}
            </button>
          ))}

          {tab === "text" && (
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 pb-2 text-xs text-[var(--text-muted)] select-none">
              <input
                type="checkbox"
                checked={showJa}
                onChange={(e) => setShowJa(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-brand-600)]"
              />
              対訳を表示
            </label>
          )}
        </nav>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {tab === "text" && (
          <div className="sf-selectable">
            {material.parts.map((part, pi) => (
              <section key={part.id} className="mb-8">
                <header className="mb-2 flex items-baseline gap-3 px-3">
                  <h2 className="text-sm font-semibold tracking-tight">
                    <span className="mr-2 text-brand-600 dark:text-brand-400">
                      Part {pi + 1}
                    </span>
                    {part.title}
                  </h2>
                  {part.summary && (
                    <p className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">
                      {part.summary}
                    </p>
                  )}
                </header>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
                  {part.sentenceIds.map((sid) => {
                    const sentence = sentences.find((s) => s.id === sid);
                    if (!sentence) return null;
                    return (
                      <SentenceRow
                        key={sentence.id}
                        sentence={sentence}
                        number={sentence.index + 1}
                        showJa={showJa}
                        isCurrent={reader.index === sentence.index}
                        isSpeaking={
                          reader.playing && reader.index === sentence.index
                        }
                        isRead={readSet.has(sentence.id)}
                        marks={marksBySentence.get(sentence.id) ?? []}
                        onPlay={() => reader.playFrom(sentence.index)}
                        onToggleRead={() =>
                          markRead(sentence.id, !readSet.has(sentence.id))
                        }
                        onMark={(kind, selected) =>
                          addMark(sentence, kind, selected)
                        }
                      />
                    );
                  })}
                </div>
              </section>
            ))}
            <p className="px-3 text-xs text-[var(--text-muted)]">
              ヒント: スペースキーで再生／停止、←→ で文の移動、J で対訳の表示切り替え。
              分からない箇所はドラッグで選んでから「？」を押すと、その範囲について解説します。
            </p>
          </div>
        )}

        {tab === "vocab" && (
          <VocabTab
            material={material}
            learned={learnedSet}
            onToggleLearned={(vid) => {
              const set = new Set(learnedSet);
              if (set.has(vid)) set.delete(vid);
              else set.add(vid);
              updateProgress({ learnedVocabIds: [...set] });
            }}
            rate={settings.rate}
            voiceURI={settings.voiceURI}
          />
        )}

        {tab === "weakness" && (
          <div className="space-y-4">
            {marks.length === 0 ? (
              <Notice tone="info">
                まだ印がありません。本文タブで分からない箇所の「？」を押すと、
                聞き取り・単語・文法のどれでつまずいたかを記録して、その場で解説します。
              </Notice>
            ) : (
              marks.map((mark) => (
                <MarkCard
                  key={mark.id}
                  mark={mark}
                  onRetry={retryMark}
                  onResolve={toggleResolved}
                  onDelete={removeMark}
                />
              ))
            )}
          </div>
        )}
      </div>

      {tab === "text" && (
        <PlayerBar
          playing={reader.playing}
          position={reader.index}
          total={sentences.length}
          parts={material.parts}
          activePartId={activePart?.id ?? ""}
          settings={settings}
          onChange={patchSettings}
          onToggle={reader.toggle}
          onStep={reader.step}
          onRangeReset={() =>
            patchSettings({ range: [0, Math.max(0, sentences.length - 1)] })
          }
          onRangePart={(partId) => {
            const part = material.parts.find((p) => p.id === partId);
            if (!part || part.sentenceIds.length === 0) return;
            const indexes = part.sentenceIds
              .map((sid) => sentences.find((s) => s.id === sid)?.index ?? -1)
              .filter((n) => n >= 0);
            const lo = Math.min(...indexes);
            const hi = Math.max(...indexes);
            patchSettings({ range: [lo, hi] });
            reader.playFrom(lo);
          }}
        />
      )}
    </div>
  );
}

/* ---------- 再生設定の保存（教材をまたいで共通） ---------- */

function readSettings(): Partial<ReaderSettings> {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    // range は教材ごとに決まるので持ち越さない
    delete parsed.range;
    return parsed;
  } catch {
    return {};
  }
}

function writeSettings(settings: ReaderSettings): void {
  try {
    const { range: _range, ...rest } = settings;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
  } catch {
    /* 保存できなくても再生には影響しない */
  }
}
