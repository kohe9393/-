import { NextResponse } from "next/server";

import { explainWeakness, hasApiKey, toUserMessage } from "@/lib/claude";
import type { WeaknessKind } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const KINDS: WeaknessKind[] = ["listening", "vocab", "grammar"];

export async function POST(request: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      {
        error:
          "AI解説には ANTHROPIC_API_KEY が必要です。設定すると、印を付けた箇所をその場で解説できます。",
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const kind = body.kind as WeaknessKind;
  const sentence = typeof body.sentence === "string" ? body.sentence : "";

  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "つまずきの種類が不正です。" }, { status: 400 });
  }
  if (!sentence.trim()) {
    return NextResponse.json({ error: "対象の文がありません。" }, { status: 400 });
  }

  try {
    const explanation = await explainWeakness({
      kind,
      sentence,
      sentenceJa: typeof body.sentenceJa === "string" ? body.sentenceJa : "",
      selectedText: typeof body.selectedText === "string" ? body.selectedText : "",
      contextBefore: typeof body.contextBefore === "string" ? body.contextBefore : "",
      contextAfter: typeof body.contextAfter === "string" ? body.contextAfter : "",
    });
    return NextResponse.json({ explanation });
  } catch (err) {
    console.error("[scriptflow] explain failed", err);
    return NextResponse.json({ error: toUserMessage(err) }, { status: 502 });
  }
}
