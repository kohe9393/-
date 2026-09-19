/** 教材のレベル。原サイトの「共通テスト / 英検2級 / TOEIC / TOEFL」に合わせる。 */
export type LevelKey =
  | "eiken3"
  | "kyotsu"
  | "eiken2"
  | "toeic"
  | "toefl"
  | "unknown";

export const LEVEL_LABEL: Record<LevelKey, string> = {
  eiken3: "英検3級",
  kyotsu: "共通テスト",
  eiken2: "英検2級",
  toeic: "TOEIC",
  toefl: "TOEFL",
  unknown: "レベル判定なし",
};

export const LEVEL_ORDER: LevelKey[] = [
  "eiken3",
  "kyotsu",
  "eiken2",
  "toeic",
  "toefl",
  "unknown",
];

/** 1文。英文は入力をそのまま保持し、AI は訳と注記だけを足す。 */
export interface Sentence {
  id: string;
  /** 0 始まりの通し番号 */
  index: number;
  /** 英文（原文のまま。AI に書き換えさせない） */
  en: string;
  /** 日本語訳。未生成なら空文字 */
  ja: string;
  /** 所属するパートの id */
  partId: string;
}

/** 教材を意味のかたまりに割った「パート」。 */
export interface Part {
  id: string;
  index: number;
  /** 日本語の見出し */
  title: string;
  /** 1行の要約 */
  summary: string;
  sentenceIds: string[];
}

/** 重要単語。 */
export interface VocabItem {
  id: string;
  word: string;
  /** 発音記号（任意） */
  phonetic: string;
  /** 品詞（名詞 / 動詞 …） */
  pos: string;
  /** 日本語語義 */
  meaning: string;
  /** 本文での用例（原文の該当文） */
  example: string;
  exampleJa: string;
  /** 初出の文 id */
  sentenceId: string;
}

/** 弱点タグの種類。原サイトの「聞き取れない / 単語 / 文法」。 */
export type WeaknessKind = "listening" | "vocab" | "grammar";

export const WEAKNESS_LABEL: Record<WeaknessKind, string> = {
  listening: "聞き取れない",
  vocab: "単語がわからない",
  grammar: "文法・構文がわからない",
};

export const WEAKNESS_SHORT: Record<WeaknessKind, string> = {
  listening: "聞き取り",
  vocab: "単語",
  grammar: "文法",
};

/** AI が返すその場解説。 */
export interface Explanation {
  /** 一言でいうと */
  headline: string;
  /** 本文の解説 */
  explanation: string;
  /** 覚えておくポイント */
  keyPoints: string[];
  /** 同じ型の例文 */
  relatedExample: string;
  relatedExampleJa: string;
}

/** 「ここが分からない」の記録。AI 解説がぶら下がる。 */
export interface WeaknessMark {
  id: string;
  materialId: string;
  /** 教材名（教材を横断して見るときの表示用） */
  materialTitle: string;
  sentenceId: string;
  /** 対象の英文（教材が消えても弱点は残せるように控えておく） */
  sentenceEn: string;
  sentenceJa: string;
  kind: WeaknessKind;
  /** ドラッグで選択した範囲（空なら文全体） */
  selectedText: string;
  explanation: Explanation | null;
  /** 解説の取得状態 */
  status: "idle" | "loading" | "done" | "error";
  /** status === "error" のときの理由 */
  errorMessage: string;
  createdAt: number;
  resolved: boolean;
}

export type MaterialSource = "paste" | "photo" | "sample";

/** 生成された 1 冊の教材。 */
export interface Material {
  id: string;
  /** 英語タイトル */
  title: string;
  /** 日本語タイトル */
  titleJa: string;
  /** 日本語の概要（2〜3文） */
  summary: string;
  level: LevelKey;
  /** ジャンルタグ（日本語） */
  tags: string[];
  wordCount: number;
  source: MaterialSource;
  createdAt: number;
  parts: Part[];
  sentences: Sentence[];
  vocab: VocabItem[];
  /** AI で対訳・単語まで作れたか。false ならオフライン簡易解析。 */
  aiGenerated: boolean;
  /** オフライン解析になった理由（あれば画面に出す） */
  notice?: string;
}

/** 学習進捗。教材ごとに 1 件。 */
export interface Progress {
  materialId: string;
  /** 音読チェック済みの文 */
  readSentenceIds: string[];
  /** 覚えた単語 */
  learnedVocabIds: string[];
  lastSentenceId: string;
  updatedAt: number;
  /** 学習を開いた回数 */
  sessions: number;
}

export function emptyProgress(materialId: string): Progress {
  return {
    materialId,
    readSentenceIds: [],
    learnedVocabIds: [],
    lastSentenceId: "",
    updatedAt: Date.now(),
    sessions: 0,
  };
}

/** /api/analyze のレスポンス。 */
export interface AnalyzeResponse {
  material: Material;
}
