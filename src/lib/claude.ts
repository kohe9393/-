import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { buildMaterial, type RawPart, type RawVocab } from "./material";
import { chunk, segment } from "./segment";
import type {
  Explanation,
  LevelKey,
  Material,
  MaterialSource,
  WeaknessKind,
} from "./types";
import { WEAKNESS_LABEL } from "./types";

const MODEL = process.env.SCRIPTFLOW_MODEL ?? "claude-opus-5";

/** モデルが応じられないときに自動で別モデルへ回すサーバサイドフォールバック。 */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** 1 回の翻訳リクエストに載せる文の数。 */
const TRANSLATE_CHUNK = 25;

/** 解析にかける入力の上限（文字）。超える分は呼び出し側で弾く。 */
export const MAX_INPUT_CHARS = 20000;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!cached) cached = new Anthropic();
  return cached;
}

/* ------------------------------------------------------------------ */
/* スキーマ                                                            */
/* ------------------------------------------------------------------ */

const LEVEL_VALUES = ["eiken3", "kyotsu", "eiken2", "toeic", "toefl"] as const;

const MetaSchema = z.object({
  titleEn: z.string().describe("本文にふさわしい英語のタイトル（5語程度）"),
  titleJa: z.string().describe("日本語のタイトル"),
  summaryJa: z.string().describe("日本語で2〜3文の概要"),
  level: z
    .enum(LEVEL_VALUES)
    .describe(
      "難易度の目安: eiken3=英検3級, kyotsu=共通テスト, eiken2=英検2級, toeic=TOEIC, toefl=TOEFL",
    ),
  tags: z.array(z.string()).describe("日本語のジャンルタグを2〜4個"),
  parts: z
    .array(
      z.object({
        startSentence: z.number().int().describe("このパートの最初の文番号(1始まり)"),
        endSentence: z.number().int().describe("このパートの最後の文番号(1始まり)"),
        title: z.string().describe("日本語の小見出し"),
        summary: z.string().describe("日本語1文の要約"),
      }),
    )
    .describe("本文を意味のまとまりで3〜6個に区切る。番号は重複・欠落なく連続させる"),
  vocab: z
    .array(
      z.object({
        word: z.string().describe("本文に出てくる語・熟語（原形ではなく本文の表記）"),
        phonetic: z.string().describe("発音記号。分からなければ空文字"),
        pos: z.string().describe("品詞（名詞・動詞・形容詞・副詞・熟語 など）"),
        meaning: z.string().describe("この文脈での日本語の意味"),
        exampleJa: z.string().describe("初出の文の日本語訳"),
        sentenceNumber: z.number().int().describe("初出の文番号(1始まり)"),
      }),
    )
    .describe("学習者がつまずきそうな重要語を8〜16個"),
});

const TranslationSchema = z.object({
  translations: z.array(
    z.object({
      n: z.number().int().describe("文番号(1始まり)"),
      ja: z.string().describe("その文の自然な日本語訳"),
    }),
  ),
});

const ExplainSchema = z.object({
  headline: z.string().describe("一言でいうと何が起きているか（40字以内）"),
  explanation: z.string().describe("日本語の解説。3〜6文。改行で区切ってよい"),
  keyPoints: z.array(z.string()).describe("覚えておくポイントを2〜4個、短く"),
  relatedExample: z.string().describe("同じ型を使った短い英語の例文"),
  relatedExampleJa: z.string().describe("その例文の日本語訳"),
});

const OcrSchema = z.object({
  text: z.string().describe("画像から読み取った英文。原文のまま、改行も保つ"),
  note: z.string().describe("読み取れない箇所があれば日本語で一言。無ければ空文字"),
});

/* ------------------------------------------------------------------ */
/* 共通呼び出し                                                        */
/* ------------------------------------------------------------------ */

type Effort = "low" | "medium" | "high";

async function parseJson<T extends z.ZodType>(params: {
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  maxTokens: number;
  effort: Effort;
}): Promise<z.infer<T>> {
  const message = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: params.maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: params.system,
    messages: [{ role: "user", content: params.content }],
    output_config: {
      effort: params.effort,
      format: betaZodOutputFormat(params.schema),
    },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("モデルがこの内容の処理を拒否しました。別のテキストでお試しください。");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("出力が長すぎて途中で切れました。テキストを短くして再度お試しください。");
  }
  if (!message.parsed_output) {
    throw new Error("解析結果を読み取れませんでした。もう一度お試しください。");
  }
  return message.parsed_output as z.infer<T>;
}

/** 文に 1 始まりの番号を振ったプレーンテキスト。 */
function numbered(sentences: string[], offset = 0): string {
  return sentences.map((s, i) => `${offset + i + 1}. ${s}`).join("\n");
}

/* ------------------------------------------------------------------ */
/* 1. スクリプト解析                                                    */
/* ------------------------------------------------------------------ */

const META_SYSTEM = `あなたは日本人の英語学習者向けに音読・シャドーイング教材を作る編集者です。
渡されるのは番号つきの英文です。英文そのものは絶対に書き換えず、番号の対応を厳密に守ってください。

- パート分けは「話の展開が変わるところ」で区切ります。startSentence / endSentence は 1 から最後の文番号まで、重複も欠落もなく連続させてください。
- 重要語は、その文脈での意味を書きます。辞書の第一義をそのまま写さないでください。
- レベルは語彙と構文の難しさから選びます。`;

const TRANSLATE_SYSTEM = `あなたは日本人の英語学習者向けの対訳を作る翻訳者です。
番号つきの英文が渡されます。1 文ずつ、対応する番号で日本語訳を返してください。

- 直訳ではなく、日本語として自然に読める訳にします。ただし原文にない情報は足しません。
- 1 文は 1 訳に対応させます。文を結合したり分割したりしないでください。
- 会話文の口調（丁寧/くだけた）は原文に合わせます。
- 渡された番号すべてに訳を返してください。`;

export async function analyzeWithClaude(
  text: string,
  source: MaterialSource,
): Promise<Material> {
  const seg = segment(text);
  if (seg.sentences.length === 0) {
    throw new Error("英文が見つかりませんでした。");
  }

  const metaPromise = parseJson({
    schema: MetaSchema,
    system: META_SYSTEM,
    content: `次の英文を解析してください。全 ${seg.sentences.length} 文です。\n\n${numbered(seg.sentences)}`,
    maxTokens: 16000,
    effort: "high",
  });

  // 長い本文は 25 文ずつに分けて並列で訳す（1 回の出力が長くなりすぎないように）
  const groups = chunk(
    seg.sentences.map((en, i) => ({ en, n: i + 1 })),
    TRANSLATE_CHUNK,
  );
  const translationPromises = groups.map((group) =>
    parseJson({
      schema: TranslationSchema,
      system: TRANSLATE_SYSTEM,
      content: `次の ${group.length} 文を訳してください。番号は本文全体の通し番号です。\n\n${group
        .map((s) => `${s.n}. ${s.en}`)
        .join("\n")}`,
      maxTokens: 8000,
      effort: "medium",
    }),
  );

  const [meta, ...translationResults] = await Promise.all([
    metaPromise,
    ...translationPromises,
  ]);

  const translations = new Map<number, string>();
  for (const result of translationResults) {
    for (const t of result.translations) {
      if (t.n >= 1 && t.n <= seg.sentences.length) translations.set(t.n, t.ja);
    }
  }

  return buildMaterial({
    text,
    source,
    title: meta.titleEn,
    titleJa: meta.titleJa,
    summary: meta.summaryJa,
    level: meta.level as LevelKey,
    tags: meta.tags,
    translations,
    parts: meta.parts as RawPart[],
    vocab: meta.vocab as RawVocab[],
    aiGenerated: true,
  });
}

/* ------------------------------------------------------------------ */
/* 2. 弱点のその場解説                                                  */
/* ------------------------------------------------------------------ */

const EXPLAIN_SYSTEM = `あなたは日本人の英語学習者に一対一で教える講師です。
学習者が「ここが分からない」と印を付けた箇所について、その場で短く解説します。

- 相手は日本語話者です。解説はすべて日本語で書きます。
- つまずきの種類に合わせて答えます。
  - 聞き取れない: 音のつながり（リエゾン）・脱落・弱形・リズムを、実際にどう聞こえるかで説明する。
  - 単語がわからない: その文脈での意味、語源やコアイメージ、紛らわしい語との違い。
  - 文法・構文がわからない: 文の骨格（S/V/O）を示し、どの語がどこに掛かるかを説明する。
- 文法用語を使うときは一度かみ砕きます。
- 分かった気にさせるだけの当たり障りのない説明は避け、その文の具体に踏み込んでください。`;

export interface ExplainInput {
  kind: WeaknessKind;
  sentence: string;
  sentenceJa: string;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
}

export async function explainWeakness(input: ExplainInput): Promise<Explanation> {
  const focus = input.selectedText.trim()
    ? `学習者が選んだ箇所: "${input.selectedText.trim()}"`
    : "学習者は文全体に印を付けています。";

  const content = `つまずきの種類: ${WEAKNESS_LABEL[input.kind]}

対象の文: ${input.sentence}
その訳: ${input.sentenceJa || "(訳なし)"}
${focus}

前後の文:
${input.contextBefore || "(なし)"}
${input.contextAfter || "(なし)"}`;

  return parseJson({
    schema: ExplainSchema,
    system: EXPLAIN_SYSTEM,
    content,
    maxTokens: 4000,
    effort: "medium",
  });
}

/* ------------------------------------------------------------------ */
/* 3. 写真から英文を読み取る                                            */
/* ------------------------------------------------------------------ */

const OCR_SYSTEM = `あなたは画像から英文を書き起こす校正者です。
写っている英文を、綴り・句読点・改行までそのまま書き起こします。
勝手に直したり、要約したり、訳したりしないでください。
ページ番号・ヘッダー・設問番号など本文でないものは含めません。`;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function extractTextFromImage(
  base64: string,
  mediaType: ImageMediaType,
): Promise<{ text: string; note: string }> {
  return parseJson({
    schema: OcrSchema,
    system: OCR_SYSTEM,
    content: [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: "この画像の英文を書き起こしてください。" },
    ],
    maxTokens: 8000,
    effort: "medium",
  });
}

/** Anthropic SDK の例外を利用者向けの日本語に直す。 */
export function toUserMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "ANTHROPIC_API_KEY が正しくありません。.env.local を確認してください。";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "APIのレート制限に達しました。少し待ってから再度お試しください。";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Anthropic API に接続できませんでした。ネットワークを確認してください。";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `リクエストが受け付けられませんでした (400)。${err.message}`;
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API がエラーを返しました${err.status ? ` (${err.status})` : ""}。`;
  }
  if (err instanceof Error) return err.message;
  return "解析中に不明なエラーが発生しました。";
}
