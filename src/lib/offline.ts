import { buildMaterial } from "./material";
import { segment } from "./segment";
import type { Material, MaterialSource } from "./types";

/** 中学英語レベルの高頻度語。重要単語の候補から外す。 */
const STOPWORDS = new Set(
  `a about after all also an and any are as at be because been before but by can come could day did do does down each even find first for from get give go good great had has have he her here him his how i if in into is it its just know like little long look made make man many may me more most much must my never new no not now of on one only or other our out over own people put said same say see she should since so some still such take than that the their them then there these they thing think this those though three through time to too two up us use very want was way we well went were what when where which while who why will with would year you your`
    .split(/\s+/),
);

/**
 * API キーが無いときの簡易解析。
 * 訳は付けられないが、文分割・段落パート・頻出語の抽出まではできるので
 * 音読／シャドーイングの練習にはそのまま使える。
 */
export function analyzeOffline(
  text: string,
  source: MaterialSource,
  notice: string,
): Material {
  const seg = segment(text);
  const freq = new Map<string, { count: number; first: number }>();

  seg.sentences.forEach((sentence, i) => {
    const words = sentence.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? [];
    for (const w of new Set(words)) {
      if (STOPWORDS.has(w)) continue;
      const entry = freq.get(w);
      if (entry) entry.count += 1;
      else freq.set(w, { count: 1, first: i + 1 });
    }
  });

  const vocab = [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .slice(0, 12)
    .map(([word, info]) => ({
      word,
      meaning: "",
      sentenceNumber: info.first,
    }));

  return buildMaterial({
    text,
    source,
    tags: [],
    vocab,
    aiGenerated: false,
    notice,
  });
}
