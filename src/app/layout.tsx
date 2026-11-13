import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

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
    <html lang="ja" className={geist.variable}>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-card focus:bg-surface focus:px-4 focus:py-2 focus:font-medium focus:text-text focus:shadow-raise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          本文へ移動
        </a>
        <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-md">
          <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <NavLink
              href="/"
              variant="bare"
              className="font-bold text-lg hover:text-primary transition duration-200 ease-[var(--ease-out-soft)] motion-reduce:transition-none motion-safe:active:scale-[0.98]"
              pendingClassName="opacity-50"
            >
              ホームへ
            </NavLink>
          </div>
        </header>
        <div className="w-full max-w-2xl mx-auto px-4 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
