import { NextResponse } from "next/server";

import { hasApiKey } from "@/lib/claude";

export const runtime = "nodejs";

/** 画面側で「AI機能が使えるか」を出し分けるための小さなエンドポイント。 */
export async function GET() {
  return NextResponse.json({ ai: hasApiKey() });
}
