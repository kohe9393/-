"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { sampleMaterials } from "@/lib/samples";
import { saveMaterial } from "@/lib/storage";
import type { Material } from "@/lib/types";
import { GhostButton, Notice, PrimaryButton } from "@/components/ui";

type Mode = "paste" | "photo";

/** 生成中に順番に点灯する工程。原サイトの「約60秒で完成」に合わせた見せ方。 */
const STEPS = [
  "英文を文に分けています",
  "英日対訳をつくっています",
  "重要単語を選んでいます",
  "パートに分けています",
] as const;

const PLACEHOLDER = `Paste an English script here.

洋書の一節、ニュース記事、TED のトランスクリプト、教科書の本文 — 英文ならなんでも。
1回に取り込めるのは 20,000 文字までです。`;

export function CreateFlow({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<null | "analyze" | "ocr">(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [ocrNote, setOcrNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 生成中の工程表示を一定間隔で進める（実際の進捗ではなく待ち時間の目安）
  useEffect(() => {
    if (busy !== "analyze") {
      if (timerRef.current) clearInterval(timerRef.current);
      setStep(0);
      return;
    }
    timerRef.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 9000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [busy]);

  const charCount = text.trim().length;

  async function handleAnalyze() {
    setError("");
    setBusy("analyze");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, source: mode === "photo" ? "photo" : "paste" }),
      });
      const data: { material?: Material; error?: string } = await res.json();
      if (!res.ok || !data.material) {
        setError(data.error ?? "解析に失敗しました。");
        return;
      }
      saveMaterial(data.material);
      router.push(`/study/${data.material.id}`);
    } catch {
      setError("サーバーに接続できませんでした。開発サーバーが動いているか確認してください。");
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(file: File) {
    setError("");
    setOcrNote("");
    if (file.size > 8 * 1024 * 1024) {
      setError("画像が大きすぎます。8MB 以下にしてください。");
      return;
    }
    setBusy("ocr");
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data: { text?: string; note?: string; error?: string } = await res.json();
      if (!res.ok || !data.text) {
        setError(data.error ?? "画像を読み取れませんでした。");
        return;
      }
      setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${data.text}` : data.text!));
      if (data.note?.trim()) setOcrNote(data.note.trim());
      setMode("paste");
    } catch {
      setError("画像の読み取りに失敗しました。");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function loadSample() {
    const sample = sampleMaterials()[0];
    setText(sample.sentences.map((s) => s.en).join(" "));
    setMode("paste");
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ModeTab active={mode === "paste"} onClick={() => setMode("paste")}>
          英文を貼る
        </ModeTab>
        <ModeTab active={mode === "photo"} onClick={() => setMode("photo")}>
          写真から読み取る
        </ModeTab>
        <button
          type="button"
          onClick={loadSample}
          className="ml-auto text-xs text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
        >
          サンプル英文を入れる
        </button>
      </div>

      {mode === "paste" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={10}
          spellCheck={false}
          disabled={busy !== null}
          className="w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-[15px] leading-7 outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-brand-400 disabled:opacity-60"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            教科書やプリントの写真を選ぶと、写っている英文を書き起こします。
            <br />
            書き起こしたテキストは送信前に編集できます。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <GhostButton
            type="button"
            className="mt-4"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
          >
            {busy === "ocr" ? "読み取っています…" : "画像を選ぶ"}
          </GhostButton>
          {!aiEnabled && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              写真の読み取りには ANTHROPIC_API_KEY が必要です。
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PrimaryButton
          type="button"
          onClick={handleAnalyze}
          disabled={busy !== null || charCount < 20}
        >
          {busy === "analyze" ? "作成中…" : "教材をつくる"}
        </PrimaryButton>
        <span className="text-xs text-[var(--text-muted)]">
          {charCount.toLocaleString()} 文字
          {charCount > 0 && charCount < 20 && " — 20文字以上必要です"}
        </span>
      </div>

      {busy === "analyze" && (
        <ol className="mt-5 space-y-2 border-t border-[var(--border)] pt-5">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-3 text-sm ${
                i <= step ? "text-[var(--text)]" : "text-[var(--text-muted)]"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  i < step
                    ? "bg-brand-500"
                    : i === step
                      ? "animate-pulse bg-brand-500"
                      : "bg-ink-300 dark:bg-ink-700"
                }`}
              />
              {label}
            </li>
          ))}
          <li className="pt-1 text-xs text-[var(--text-muted)]">
            長い英文ほど時間がかかります。このページを開いたままお待ちください。
          </li>
        </ol>
      )}

      {ocrNote && (
        <div className="mt-4">
          <Notice tone="warn">読み取りメモ: {ocrNote}</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </div>
  );
}

function ModeTab({
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
      className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
        active
          ? "bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900"
          : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}
