"use client";

import { useMemo, useState } from "react";

import * as tts from "@/lib/tts";
import type { Material, VocabItem } from "@/lib/types";
import { GhostButton, Notice, ProgressBar } from "@/components/ui";

type View = "list" | "card";

export function VocabTab({
  material,
  learned,
  onToggleLearned,
  rate,
  voiceURI,
}: {
  material: Material;
  learned: Set<string>;
  onToggleLearned: (id: string) => void;
  rate: number;
  voiceURI: string;
}) {
  const [view, setView] = useState<View>("list");
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [onlyUnlearned, setOnlyUnlearned] = useState(false);

  const items = useMemo(
    () =>
      onlyUnlearned
        ? material.vocab.filter((v) => !learned.has(v.id))
        : material.vocab,
    [material.vocab, learned, onlyUnlearned],
  );

  function say(word: string) {
    tts.speak(word, { rate, voiceURI: voiceURI || undefined });
  }

  if (material.vocab.length === 0) {
    return (
      <Notice tone="info">
        この教材には重要単語がありません。
        {!material.aiGenerated &&
          " ANTHROPIC_API_KEY を設定して取り込み直すと、語義つきの単語帳が作られます。"}
      </Notice>
    );
  }

  const learnedCount = material.vocab.filter((v) => learned.has(v.id)).length;
  const card = items[Math.min(cardIndex, items.length - 1)];

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            覚えた {learnedCount} / {material.vocab.length}
          </span>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={onlyUnlearned}
                onChange={(e) => {
                  setOnlyUnlearned(e.target.checked);
                  setCardIndex(0);
                  setRevealed(false);
                }}
                className="h-3.5 w-3.5 accent-[var(--color-brand-600)]"
              />
              未習だけ
            </label>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
              {(["list", "card"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 transition-colors ${
                    view === v
                      ? "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900"
                      : "hover:bg-ink-100 dark:hover:bg-ink-800"
                  }`}
                >
                  {v === "list" ? "一覧" : "カード"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ProgressBar value={learnedCount / material.vocab.length} />
      </div>

      {items.length === 0 ? (
        <Notice tone="info">未習の単語はありません。</Notice>
      ) : view === "list" ? (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {items.map((item) => (
            <VocabRow
              key={item.id}
              item={item}
              learned={learned.has(item.id)}
              onToggle={() => onToggleLearned(item.id)}
              onSay={() => say(item.word)}
            />
          ))}
        </ul>
      ) : (
        card && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              {Math.min(cardIndex + 1, items.length)} / {items.length}
            </p>
            <p className="reading-en mt-4 text-3xl font-semibold tracking-tight">
              {card.word}
            </p>
            {card.phonetic && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{card.phonetic}</p>
            )}
            <GhostButton type="button" className="mt-3" onClick={() => say(card.word)}>
              🔊 発音
            </GhostButton>

            {revealed ? (
              <div className="mt-6 space-y-3 text-left">
                <p className="text-center">
                  <span className="mr-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {card.pos || "—"}
                  </span>
                  <span className="text-lg">{card.meaning || "（語義なし）"}</span>
                </p>
                {card.example && (
                  <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                    <p className="reading-en text-[15px] leading-7">{card.example}</p>
                    {card.exampleJa && (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {card.exampleJa}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <GhostButton
                type="button"
                className="mt-6"
                onClick={() => setRevealed(true)}
              >
                意味を見る
              </GhostButton>
            )}

            <div className="mt-7 flex items-center justify-center gap-2">
              <GhostButton
                type="button"
                disabled={cardIndex === 0}
                onClick={() => {
                  setCardIndex((i) => Math.max(0, i - 1));
                  setRevealed(false);
                }}
              >
                前へ
              </GhostButton>
              <GhostButton
                type="button"
                onClick={() => {
                  onToggleLearned(card.id);
                  setRevealed(false);
                }}
              >
                {learned.has(card.id) ? "覚えた を外す" : "覚えた"}
              </GhostButton>
              <GhostButton
                type="button"
                disabled={cardIndex >= items.length - 1}
                onClick={() => {
                  setCardIndex((i) => Math.min(items.length - 1, i + 1));
                  setRevealed(false);
                }}
              >
                次へ
              </GhostButton>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function VocabRow({
  item,
  learned,
  onToggle,
  onSay,
}: {
  item: VocabItem;
  learned: boolean;
  onToggle: () => void;
  onSay: () => void;
}) {
  return (
    <li className="flex gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="reading-en text-lg font-medium">{item.word}</span>
          {item.phonetic && (
            <span className="text-xs text-[var(--text-muted)]">{item.phonetic}</span>
          )}
          {item.pos && (
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {item.pos}
            </span>
          )}
          <button
            type="button"
            onClick={onSay}
            aria-label={`${item.word} を再生`}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            🔊
          </button>
        </div>
        <p className="mt-1 text-sm">{item.meaning || "（語義なし）"}</p>
        {item.example && (
          <a
            href={item.sentenceId ? `#sentence-${item.sentenceId}` : undefined}
            className="reading-en mt-2 block text-sm leading-6 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {item.example}
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={learned}
        className={`h-8 shrink-0 self-start rounded-lg px-3 text-xs transition-colors ${
          learned
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
      >
        覚えた
      </button>
    </li>
  );
}
