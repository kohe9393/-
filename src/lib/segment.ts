/**
 * 英文テキストを段落 → 文に分割する。
 * 原文を一字も変えないのが前提（AI に分割させると書き換えが混ざるため自前でやる）。
 */

/** 文末ピリオドと紛らわしい略語。 */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt",
  "vs", "etc", "e.g", "i.e", "cf", "approx", "dept", "est",
  "inc", "ltd", "co", "corp", "univ", "fig", "no", "vol",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  "a.m", "p.m", "u.s", "u.k", "u.n", "ph.d", "b.a", "m.a",
]);

/** 改行・空白・スマートクォートを正規化する（文字そのものは残す）。 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/** 引用符が開いたまま閉じていないか。 */
function hasOpenQuote(text: string): boolean {
  let straight = 0;
  let open = 0;
  let close = 0;
  for (const ch of text) {
    if (ch === '"') straight++;
    else if (ch === "\u201c") open++;
    else if (ch === "\u201d") close++;
  }
  return straight % 2 === 1 || open > close;
}

/** 1 段落を文に割る。 */
function splitParagraph(paragraph: string): string[] {
  const out: string[] = [];
  let buffer = "";

  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    buffer += ch;

    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    // 連続する終端記号と閉じ引用符・閉じ括弧をまとめて取り込む
    let j = i + 1;
    while (j < paragraph.length && /[.!?]/.test(paragraph[j])) {
      buffer += paragraph[j];
      j++;
    }
    while (j < paragraph.length && /["'”’)\]]/.test(paragraph[j])) {
      buffer += paragraph[j];
      j++;
    }

    // 閉じていない引用符の中なら、会話文の途中なので区切らない。
    // ("Towel! There, behind you!" を 2 文に割らないため)
    // ただし引用が長すぎると 1 文が巨大になるので、そこは諦めて区切る。
    if (buffer.length < 200 && hasOpenQuote(buffer)) {
      i = j - 1;
      continue;
    }

    const next = paragraph.slice(j);
    // 文末なら確定
    if (next.trim() === "") {
      i = j - 1;
      out.push(buffer.trim());
      buffer = "";
      continue;
    }
    // 次が空白 + 大文字/数字/引用符でなければ文末ではない
    if (!/^\s+["'“‘(\[]?[A-Z0-9]/.test(next)) {
      i = j - 1;
      continue;
    }
    // 略語なら文末ではない
    const tail = buffer.replace(/[.!?"'”’)\]]+$/, "");
    const lastWord = tail.split(/[\s(]/).pop()?.toLowerCase() ?? "";
    if (ch === "." && ABBREVIATIONS.has(lastWord)) {
      i = j - 1;
      continue;
    }
    // 1 文字のイニシャル（J. K. Rowling）
    if (ch === "." && /(^|\s)[A-Za-z]$/.test(tail)) {
      i = j - 1;
      continue;
    }
    // 小数点
    if (ch === "." && /\d$/.test(tail) && /^\s*\d/.test(next)) {
      i = j - 1;
      continue;
    }

    i = j - 1;
    out.push(buffer.trim());
    buffer = "";
  }

  if (buffer.trim()) out.push(buffer.trim());
  return out.filter((s) => s.length > 0);
}

export interface SegmentedText {
  /** 文の配列（原文のまま） */
  sentences: string[];
  /** 文 index → 段落 index */
  paragraphOf: number[];
  paragraphCount: number;
  wordCount: number;
}

/** テキストを文に分割し、段落の対応も返す。 */
export function segment(raw: string): SegmentedText {
  const text = normalizeText(raw);
  const paragraphs = text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sentences: string[] = [];
  const paragraphOf: number[] = [];

  paragraphs.forEach((paragraph, pIndex) => {
    for (const s of splitParagraph(paragraph)) {
      sentences.push(s);
      paragraphOf.push(pIndex);
    }
  });

  return {
    sentences,
    paragraphOf,
    paragraphCount: paragraphs.length,
    wordCount: countWords(text),
  };
}

export function countWords(text: string): number {
  const m = text.match(/[A-Za-z0-9'’-]+/g);
  return m ? m.length : 0;
}

/** 配列を size ごとに区切る。 */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
