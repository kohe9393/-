import type { Metadata, Viewport } from "next";

import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Flow — 英文を貼るだけで、音声つき音読教材に",
  description:
    "英文スクリプトや写真を入れるだけで、英日対訳・重要単語・パート分割つきの音読教材に。分からない箇所に印を付ければ、その場でAIが解説します。",
};

export const viewport: Viewport = {
  themeColor: "#faf9f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-dvh antialiased">
        <Header />
        <main>{children}</main>
        <footer className="mt-20 border-t border-[var(--border)] px-5 py-8 text-center text-xs text-[var(--text-muted)]">
          Script Flow — 音声はブラウザの読み上げ機能、解析は Claude を使っています。
        </footer>
      </body>
    </html>
  );
}
