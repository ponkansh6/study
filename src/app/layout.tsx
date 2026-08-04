import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { 
  width: "device-width", 
  initialScale: 1, 
  viewportFit: "cover" 
};

export const metadata: Metadata = {
  title: "Study - 1ナレッジ1問学習アプリ",
  description: "ナレッジから1問ずつ生成し、苦手優先で繰り返し学習するアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh">
        <div className="w-full max-w-2xl mx-auto px-4">{children}</div>
      </body>
    </html>
  );
}
