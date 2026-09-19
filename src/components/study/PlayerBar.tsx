"use client";

import { useEffect, useState } from "react";

import { RATE_STEPS, isSupported, onVoicesReady } from "@/lib/tts";
import type { Part } from "@/lib/types";
import type { ReaderSettings } from "./useReader";

export function PlayerBar({
  playing,
  position,
  total,
  parts,
  activePartId,
  settings,
  onChange,
  onToggle,
  onStep,
  onRangeReset,
  onRangePart,
}: {
  playing: boolean;
  position: number;
  total: number;
  parts: Part[];
  activePartId: string;
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onRangeReset: () => void;
  onRangePart: (partId: string) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isSupported());
    return onVoicesReady(setVoices);
  }, []);

  const [lo, hi] = settings.range;
  const whole = lo === 0 && hi >= total - 1;

  return (
    <div className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {!supported && (
          <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
            このブラウザは音声合成に対応していません。Chrome / Edge / Safari をお試しください。
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label="前の文"
            className="rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            ◀◀
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? "停止" : "再生"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700"
          >
            {playing ? "■" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label="次の文"
            className="rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            ▶▶
          </button>

          <span className="ml-1 text-xs tabular-nums text-[var(--text-muted)]">
            {position + 1} / {total}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-[var(--text-muted)]">
              速さ
              <select
                value={settings.rate}
                onChange={(e) => onChange({ rate: Number(e.target.value) })}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
              >
                {RATE_STEPS.map((r) => (
                  <option key={r} value={r}>
                    {r.toFixed(2)}x
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-[var(--text-muted)]">
              回数
              <select
                value={settings.repeat}
                onChange={(e) => onChange({ repeat: Number(e.target.value) })}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
              >
                {[1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}回
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
          <Toggle
            checked={settings.autoAdvance}
            onChange={(v) => onChange({ autoAdvance: v })}
          >
            次の文へ進む
          </Toggle>
          <Toggle checked={settings.loop} onChange={(v) => onChange({ loop: v })}>
            範囲をくり返す
          </Toggle>

          <div className="flex flex-wrap items-center gap-1.5">
            <span>範囲</span>
            <RangeChip active={whole} onClick={onRangeReset}>
              全文
            </RangeChip>
            {parts.map((part, i) => (
              <RangeChip
                key={part.id}
                active={!whole && part.id === activePartId}
                onClick={() => onRangePart(part.id)}
              >
                P{i + 1}
              </RangeChip>
            ))}
          </div>

          {voices.length > 1 && (
            <label className="flex items-center gap-1.5">
              声
              <select
                value={settings.voiceURI}
                onChange={(e) => onChange({ voiceURI: e.target.value })}
                className="max-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
              >
                <option value="">既定</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--color-brand-600)]"
      />
      {children}
    </label>
  );
}

function RangeChip({
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
      className={`rounded-full px-2 py-0.5 transition-colors ${
        active
          ? "bg-brand-600 text-white"
          : "border border-[var(--border)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
