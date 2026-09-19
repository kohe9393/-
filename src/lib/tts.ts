"use client";

/**
 * Web Speech API (speechSynthesis) を使った音読エンジン。
 * ブラウザ内蔵の音声なので API キーも通信も要らない。
 */

export interface SpeakOptions {
  rate: number;
  voiceURI?: string;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** 英語音声だけを、自然な順（既定音声 → ローカル → その他）で返す。 */
export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (!isSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => {
      if (a.default !== b.default) return a.default ? -1 : 1;
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * 音声リストは非同期に届くブラウザがある。届くまで待つ。
 */
export function onVoicesReady(cb: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (!isSupported()) return () => {};
  const emit = () => cb(listEnglishVoices());
  emit();
  window.speechSynthesis.addEventListener("voiceschanged", emit);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", emit);
}

export function cancel(): void {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
}

/** 1 文を読み上げる。停止は cancel()。 */
export function speak(text: string, opts: SpeakOptions): void {
  if (!isSupported()) {
    opts.onError?.("このブラウザは音声合成に対応していません。");
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts.rate;
  utterance.lang = "en-US";
  if (opts.voiceURI) {
    const voice = synth.getVoices().find((v) => v.voiceURI === opts.voiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
  }
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = (e) => {
    // ユーザーの停止操作（cancel）でも error が飛ぶブラウザがあるので区別する。
    if (e.error === "canceled" || e.error === "interrupted") return;
    opts.onError?.(e.error ?? "音声の再生に失敗しました。");
  };

  // Chrome は直前の cancel 直後の speak を取りこぼすことがある。
  setTimeout(() => synth.speak(utterance), 0);
}

export const RATE_STEPS = [0.6, 0.75, 0.9, 1.0, 1.1, 1.25] as const;
