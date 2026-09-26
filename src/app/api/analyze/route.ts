import { NextResponse } from "next/server";

import {
  MAX_INPUT_CHARS,
  analyzeWithClaude,
  hasApiKey,
  toUserMessage,
} from "@/lib/claude";
import { analyzeOffline } from "@/lib/offline";
import { normalizeText } from "@/lib/segment";
import type { MaterialSource } from "@/lib/types";

export const runtime = "nodejs";
/**
 * 長い本文だと解析に時間がかかるので上限を延ばす。
 * 60 秒は Vercel の無料プランの上限。有料プランなら 300 まで上げられる。
 */
export const maxDuration = 60;

const NO_KEY_NOTICE =
  "ANTHROPIC_API_KEY が設定されていないため、対訳・語義なしの簡易教材として取り込みました。音読と弱点マークはこのまま使えます。";

export async function POST(request: Request) {
  let body: { text?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const raw = typeof body.text === "string" ? body.text : "";
  const text = normalizeText(raw);
  const source: MaterialSource = body.source === "photo" ? "photo" : "paste";

  if (text.length < 20) {
    return NextResponse.json(
      { error: "英文が短すぎます。20文字以上を貼り付けてください。" },
      { status: 400 },
    );
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        error: `英文が長すぎます（${text.length.toLocaleString()}文字）。${MAX_INPUT_CHARS.toLocaleString()}文字以内に分けて取り込んでください。`,
      },
      { status: 400 },
    );
  }

  if (!hasApiKey()) {
    return NextResponse.json({
      material: analyzeOffline(text, source, NO_KEY_NOTICE),
    });
  }

  try {
    const material = await analyzeWithClaude(text, source);
    return NextResponse.json({ material });
  } catch (err) {
    console.error("[scriptflow] analyze failed", err);
    return NextResponse.json({ error: toUserMessage(err) }, { status: 502 });
  }
}
