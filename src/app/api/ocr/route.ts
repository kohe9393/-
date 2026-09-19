import { NextResponse } from "next/server";

import {
  extractTextFromImage,
  hasApiKey,
  toUserMessage,
  type ImageMediaType,
} from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** base64 は元データの約 4/3。8MB 相当で頭打ちにする。 */
const MAX_BASE64_CHARS = 11_000_000;

export async function POST(request: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      {
        error:
          "写真の読み取りには ANTHROPIC_API_KEY が必要です。テキストを直接貼り付けてください。",
      },
      { status: 503 },
    );
  }

  let body: { dataUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const match = /^data:([a-z/+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: "画像を読み取れませんでした。" }, { status: 400 });
  }

  const mediaType = match[1].toLowerCase() as ImageMediaType;
  const base64 = match[2];

  if (!ALLOWED.includes(mediaType)) {
    return NextResponse.json(
      { error: "JPEG / PNG / GIF / WebP の画像を選んでください。" },
      { status: 400 },
    );
  }
  if (base64.length > MAX_BASE64_CHARS) {
    return NextResponse.json(
      { error: "画像が大きすぎます。8MB 以下にしてください。" },
      { status: 413 },
    );
  }

  try {
    const result = await extractTextFromImage(base64, mediaType);
    if (!result.text.trim()) {
      return NextResponse.json(
        { error: "画像から英文を読み取れませんでした。写りを確かめてください。" },
        { status: 422 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[scriptflow] ocr failed", err);
    return NextResponse.json({ error: toUserMessage(err) }, { status: 502 });
  }
}
