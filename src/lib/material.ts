import { countWords, segment } from "./segment";
import type {
  LevelKey,
  Material,
  MaterialSource,
  Part,
  Sentence,
  VocabItem,
} from "./types";

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** AI が返すパート区切り（文 index は 1 始まり）。 */
export interface RawPart {
  startSentence: number;
  endSentence: number;
  title: string;
  summary: string;
}

/** AI が返す語彙。 */
export interface RawVocab {
  word: string;
  phonetic?: string;
  pos?: string;
  meaning: string;
  exampleJa?: string;
  sentenceNumber?: number;
}

export interface BuildInput {
  text: string;
  source: MaterialSource;
  title?: string;
  titleJa?: string;
  summary?: string;
  level?: LevelKey;
  tags?: string[];
  /** 文番号(1始まり) → 日本語訳 */
  translations?: Map<number, string>;
  parts?: RawPart[];
  vocab?: RawVocab[];
  aiGenerated: boolean;
  notice?: string;
  id?: string;
  createdAt?: number;
}

/**
 * 分割済みの英文と AI の解析結果を 1 冊の教材に組み立てる。
 * AI 側が欠けていても（オフライン時）成立するように、すべて任意項目として扱う。
 */
export function buildMaterial(input: BuildInput): Material {
  const seg = segment(input.text);
  const id = input.id ?? newId("m");

  const rawParts =
    input.parts && input.parts.length > 0
      ? normalizeParts(input.parts, seg.sentences.length)
      : fallbackParts(seg.paragraphOf, seg.sentences.length);

  const parts: Part[] = rawParts.map((p, i) => ({
    id: `${id}_p${i + 1}`,
    index: i,
    title: p.title.trim() || `パート${i + 1}`,
    summary: p.summary.trim(),
    sentenceIds: [],
  }));

  const sentences: Sentence[] = seg.sentences.map((en, i) => {
    const partIndex = rawParts.findIndex(
      (p) => i + 1 >= p.startSentence && i + 1 <= p.endSentence,
    );
    const part = parts[partIndex >= 0 ? partIndex : parts.length - 1];
    const sentence: Sentence = {
      id: `${id}_s${i + 1}`,
      index: i,
      en,
      ja: input.translations?.get(i + 1)?.trim() ?? "",
      partId: part.id,
    };
    part.sentenceIds.push(sentence.id);
    return sentence;
  });

  // 文が 1 つも入らなかったパートは落とす
  const usedParts = parts.filter((p) => p.sentenceIds.length > 0);
  usedParts.forEach((p, i) => {
    p.index = i;
  });

  const vocab: VocabItem[] = (input.vocab ?? []).map((v, i) => {
    const sentenceIndex =
      v.sentenceNumber && v.sentenceNumber >= 1 && v.sentenceNumber <= sentences.length
        ? v.sentenceNumber - 1
        : findFirstSentenceWith(seg.sentences, v.word);
    const host = sentenceIndex >= 0 ? sentences[sentenceIndex] : undefined;
    return {
      id: `${id}_v${i + 1}`,
      word: v.word.trim(),
      phonetic: v.phonetic?.trim() ?? "",
      pos: v.pos?.trim() ?? "",
      meaning: v.meaning.trim(),
      example: host?.en ?? "",
      exampleJa: v.exampleJa?.trim() ?? host?.ja ?? "",
      sentenceId: host?.id ?? "",
    };
  });

  return {
    id,
    title: input.title?.trim() || deriveTitle(seg.sentences),
    titleJa: input.titleJa?.trim() ?? "",
    summary: input.summary?.trim() ?? "",
    level: input.level ?? "unknown",
    tags: input.tags ?? [],
    wordCount: seg.wordCount || countWords(input.text),
    source: input.source,
    createdAt: input.createdAt ?? Date.now(),
    parts: usedParts,
    sentences,
    vocab,
    aiGenerated: input.aiGenerated,
    notice: input.notice,
  };
}

/** AI が返した区切りを、抜け・重なり・範囲外なしの連続区間に直す。 */
function normalizeParts(raw: RawPart[], total: number): RawPart[] {
  const sorted = [...raw]
    .map((p) => ({
      ...p,
      startSentence: clamp(Math.round(p.startSentence), 1, total),
      endSentence: clamp(Math.round(p.endSentence), 1, total),
    }))
    .filter((p) => p.endSentence >= p.startSentence)
    .sort((a, b) => a.startSentence - b.startSentence);

  if (sorted.length === 0) return [{ startSentence: 1, endSentence: total, title: "本文", summary: "" }];

  const out: RawPart[] = [];
  let cursor = 1;
  for (const p of sorted) {
    const start = Math.max(cursor, p.startSentence);
    if (start > total) break;
    const end = Math.max(start, p.endSentence);
    out.push({ ...p, startSentence: start, endSentence: Math.min(end, total) });
    cursor = Math.min(end, total) + 1;
  }
  if (out.length === 0) {
    return [{ startSentence: 1, endSentence: total, title: "本文", summary: "" }];
  }
  // 末尾の取りこぼしは最後のパートに寄せる
  out[out.length - 1].endSentence = total;
  return out;
}

/** AI なしのとき、段落をそのままパートにする。 */
function fallbackParts(paragraphOf: number[], total: number): RawPart[] {
  if (total === 0) return [];
  const parts: RawPart[] = [];
  let current = paragraphOf[0];
  let start = 1;
  for (let i = 1; i <= total; i++) {
    const p = paragraphOf[i - 1];
    if (p !== current) {
      parts.push({
        startSentence: start,
        endSentence: i - 1,
        title: `パート${parts.length + 1}`,
        summary: "",
      });
      current = p;
      start = i;
    }
  }
  parts.push({
    startSentence: start,
    endSentence: total,
    title: `パート${parts.length + 1}`,
    summary: "",
  });

  // 段落が細かすぎるときは 5 文単位にまとめ直す
  if (parts.length > 8) {
    const merged: RawPart[] = [];
    for (let i = 1; i <= total; i += 5) {
      merged.push({
        startSentence: i,
        endSentence: Math.min(i + 4, total),
        title: `パート${merged.length + 1}`,
        summary: "",
      });
    }
    return merged;
  }
  return parts;
}

function findFirstSentenceWith(sentences: string[], word: string): number {
  const stem = word.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z'-]/g, "") ?? "";
  if (!stem) return -1;
  return sentences.findIndex((s) => s.toLowerCase().includes(stem));
}

function deriveTitle(sentences: string[]): string {
  const first = sentences[0] ?? "Untitled";
  const words = first.split(/\s+/).slice(0, 7).join(" ");
  return words.replace(/[.,;:!?]+$/, "") || "Untitled";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
