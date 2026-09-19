"use client";

import { useRef, useState } from "react";

import {
  WEAKNESS_LABEL,
  WEAKNESS_SHORT,
  type Sentence,
  type WeaknessKind,
  type WeaknessMark,
} from "@/lib/types";

const KINDS: WeaknessKind[] = ["listening", "vocab", "grammar"];

const KIND_TONE: Record<WeaknessKind, string> = {
  listening: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  vocab: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  grammar: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
};

export function SentenceRow({
  sentence,
  number,
  showJa,
  isCurrent,
  isSpeaking,
  isRead,
  marks,
  onPlay,
  onToggleRead,
  onMark,
}: {
  sentence: Sentence;
  number: number;
  showJa: boolean;
  isCurrent: boolean;
  isSpeaking: boolean;
  isRead: boolean;
  marks: WeaknessMark[];
  onPlay: () => void;
  onToggleRead: () => void;
  onMark: (kind: WeaknessKind, selectedText: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [revealJa, setRevealJa] = useState(false);
  const selectionRef = useRef("");
  const enRef = useRef<HTMLParagraphElement>(null);

  /** この文の中でドラッグ選択された範囲だけを覚えておく。 */
  function captureSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !enRef.current) {
      selectionRef.current = "";
      return;
    }
    const text = sel.toString().trim();
    if (text && enRef.current.contains(sel.anchorNode)) {
      selectionRef.current = text;
    } else {
      selectionRef.current = "";
    }
  }

  const jaVisible = showJa || revealJa;

  return (
    <div
      id={`sentence-${sentence.id}`}
      className={`group relative scroll-mt-24 rounded-xl px-3 py-2.5 transition-colors ${
        isCurrent
          ? "bg-brand-50 dark:bg-brand-700/15"
          : "hover:bg-ink-50 dark:hover:bg-ink-800/50"
      }`}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlay}
          title="この文から再生"
          aria-label={`${number}文目から再生`}
          className={`mt-0.5 h-6 w-6 shrink-0 rounded-full text-[11px] font-medium tabular-nums transition-colors ${
            isCurrent
              ? "bg-brand-600 text-white"
              : "bg-ink-100 text-ink-500 group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-ink-800 dark:text-ink-400 dark:group-hover:bg-brand-700/40 dark:group-hover:text-brand-200"
          } ${isSpeaking ? "sf-speaking" : ""}`}
        >
          {number}
        </button>

        <div className="min-w-0 flex-1">
          <p
            ref={enRef}
            onMouseUp={captureSelection}
            onTouchEnd={captureSelection}
            className={`reading-en text-[17px] leading-8 ${
              isRead ? "text-[var(--text-muted)]" : "text-[var(--text)]"
            }`}
          >
            {sentence.en}
          </p>

          {sentence.ja &&
            (jaVisible ? (
              <p className="mt-1 text-sm leading-7 text-[var(--text-muted)]">
                {sentence.ja}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealJa(true)}
                className="mt-1 text-xs text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
              >
                訳を見る
              </button>
            ))}

          {marks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {marks.map((mark) => (
                <a
                  key={mark.id}
                  href={`#mark-${mark.id}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${KIND_TONE[mark.kind]}`}
                >
                  {WEAKNESS_SHORT[mark.kind]}
                  {mark.status === "loading" && "…"}
                  {mark.status === "done" && " ✓"}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-1">
          <button
            type="button"
            onClick={onToggleRead}
            aria-pressed={isRead}
            title={isRead ? "音読チェックを外す" : "音読できた"}
            className={`rounded-lg px-2 py-1 text-xs transition-colors ${
              isRead
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "text-[var(--text-muted)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-ink-100 dark:hover:bg-ink-800"
            }`}
          >
            {isRead ? "読めた" : "読めた"}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                captureSelection();
                setMenuOpen((v) => !v);
              }}
              aria-expanded={menuOpen}
              title="分からないところに印を付ける"
              className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              ？
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="閉じる"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute top-full right-0 z-20 mt-1 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  <p className="border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                    {selectionRef.current
                      ? `「${truncate(selectionRef.current, 22)}」について`
                      : "この文のどこが分からない？"}
                  </p>
                  {KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        onMark(kind, selectionRef.current);
                        selectionRef.current = "";
                        setMenuOpen(false);
                      }}
                      className="block w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
                    >
                      {WEAKNESS_LABEL[kind]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
