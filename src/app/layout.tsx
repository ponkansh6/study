import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Study - 1ナレッジ1問学習アプリ",
  description: "ナレッジから1問ずつ生成し、苦手優先で繰り返し学習するアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh">
        <div className="w-full max-w-2xl mx-auto px-4 flex flex-col min-h-dvh">
          <header className="py-4 border-b border-border flex items-center justify-between">
            <Link href="/" className="font-bold text-lg hover:text-primary transition">
              ホームへ
            </Link>
          </header>
          <div className="flex-1 flex flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
