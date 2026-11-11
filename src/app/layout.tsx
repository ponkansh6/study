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
        <header className="border-b border-border bg-bg">
          <div className="w-full max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
            <NavLink
              href="/"
              variant="bare"
              aria-label="Study ホームへ"
              className="font-semibold text-[0.95rem] tracking-tight hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              pendingClassName="opacity-50"
            >
              <span className="inline-flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid size-7 place-items-center rounded-sm bg-primary text-on-primary text-xs font-bold"
                >
                  S
                </span>
                Study
              </span>
            </NavLink>
            <span className="text-[0.65rem] font-medium tracking-[0.16em] text-muted uppercase">
              Knowledge practice
            </span>
          </div>
        </header>
        <div className="w-full max-w-3xl mx-auto px-5 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
