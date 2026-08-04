import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study - Quiz Generator",
  description: "Generate quiz questions from any text",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
