"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import * as tts from "@/lib/tts";
import type { Sentence } from "@/lib/types";

export interface ReaderSettings {
  rate: number;
  voiceURI: string;
  /** 1文を何回続けて読むか */
  repeat: number;
  /** 読み終えたら次の文へ進むか */
  autoAdvance: boolean;
  /** 範囲の終わりまで来たら先頭に戻るか */
  loop: boolean;
  /** 再生する範囲 [最初の文index, 最後の文index] */
  range: [number, number];
}

export interface Reader {
  index: number;
  playing: boolean;
  error: string;
  playFrom: (index: number) => void;
  toggle: () => void;
  stop: () => void;
  step: (delta: number) => void;
  clearError: () => void;
}

/**
 * 音読プレイヤーの状態機械。
 * 再生中に設定を変えても次の文から反映されるよう、設定は ref 経由で読む。
 * 再生のたびに token を進め、古い onEnd コールバックを無効にする。
 */
export function useReader(
  sentences: Sentence[],
  settings: ReaderSettings,
  onSentenceDone?: (sentence: Sentence) => void,
): Reader {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const tokenRef = useRef(0);
  const settingsRef = useRef(settings);
  const sentencesRef = useRef(sentences);
  const doneRef = useRef(onSentenceDone);

  settingsRef.current = settings;
  sentencesRef.current = sentences;
  doneRef.current = onSentenceDone;

  const stop = useCallback(() => {
    tokenRef.current += 1;
    tts.cancel();
    setPlaying(false);
  }, []);

  const playFrom = useCallback((start: number) => {
    tokenRef.current += 1;
    const token = tokenRef.current;
    setError("");
    setPlaying(true);

    const run = (i: number, repeatDone: number) => {
      if (tokenRef.current !== token) return;
      const sentence = sentencesRef.current[i];
      if (!sentence) {
        setPlaying(false);
        return;
      }
      setIndex(i);

      const { rate, voiceURI } = settingsRef.current;
      tts.speak(sentence.en, {
        rate,
        voiceURI: voiceURI || undefined,
        onEnd: () => {
          if (tokenRef.current !== token) return;
          const s = settingsRef.current;
          const repeats = repeatDone + 1;

          if (repeats >= s.repeat) doneRef.current?.(sentence);
          if (repeats < s.repeat) {
            run(i, repeats);
            return;
          }
          if (!s.autoAdvance) {
            setPlaying(false);
            return;
          }
          const [lo, hi] = s.range;
          const next = i + 1;
          if (next > hi || next >= sentencesRef.current.length) {
            if (s.loop) {
              run(Math.max(0, lo), 0);
              return;
            }
            setPlaying(false);
            return;
          }
          run(next, 0);
        },
        onError: (reason) => {
          if (tokenRef.current !== token) return;
          setPlaying(false);
          setError(reason);
        },
      });
    };

    run(start, 0);
  }, []);

  const toggle = useCallback(() => {
    if (playing) stop();
    else playFrom(index);
  }, [playing, index, playFrom, stop]);

  const step = useCallback(
    (delta: number) => {
      const next = Math.min(
        sentencesRef.current.length - 1,
        Math.max(0, index + delta),
      );
      if (playing) playFrom(next);
      else setIndex(next);
    },
    [index, playing, playFrom],
  );

  // 画面を離れるときに読み上げを止める（ページ遷移後も喋り続けるのを防ぐ）
  useEffect(() => () => {
    tokenRef.current += 1;
    tts.cancel();
  }, []);

  return {
    index,
    playing,
    error,
    playFrom,
    toggle,
    stop,
    step,
    clearError: () => setError(""),
  };
}
