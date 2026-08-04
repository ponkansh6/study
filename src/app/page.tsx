import Link from "next/link";
import { getStats } from "@/lib/db/repository/question-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { totalQuestions, totalAnswers, overallAccuracy } = await getStats();

  return (
    <main className="py-12 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Study</h1>
        <p className="text-text/70">1ナレッジ1問学習アプリ</p>
      </header>

      <section className="grid gap-4">
        <Link
          href="/create"
          className="flex items-center justify-center p-6 bg-primary text-white rounded-xl font-bold min-h-12 hover:bg-primary-hover transition"
        >
          問題を作る
        </Link>
        <Link
          href="/answer"
          className={`flex items-center justify-center p-6 rounded-xl font-bold min-h-12 border-2 border-primary text-primary transition ${
            totalQuestions === 0 ? "opacity-50 pointer-events-none" : "hover:bg-primary/10"
          }`}
        >
          問題を解く
        </Link>
        {totalQuestions === 0 && (
          <p className="text-center text-sm text-warning">まず問題を作ってください</p>
        )}
      </section>

      <section className="bg-border/20 p-6 rounded-xl text-center space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text/60">統計</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <div className="text-xs text-text/60">問題数</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalAnswers}</div>
            <div className="text-xs text-text/60">解答数</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Math.round(overallAccuracy * 100)}%</div>
            <div className="text-xs text-text/60">正答率</div>
          </div>
        </div>
      </section>
    </main>
  );
}
