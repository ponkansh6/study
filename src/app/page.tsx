import { NavLink } from "@/components/NavLink";
import { getStats } from "@/lib/db/repository/answer-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { totalQuestions, todayAnswers, todayAccuracy } = await getStats();

  return (
    <main className="py-12 space-y-8 flex-1 flex flex-col justify-center">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Study</h1>
        <p className="text-text/70">1ナレッジ1問学習アプリ</p>
      </header>

      <section className="grid gap-4">
        <NavLink href="/create" pendingClassName="opacity-60">
          問題を作る
        </NavLink>
        <NavLink
          href="/answer"
          variant="outline"
          aria-disabled={totalQuestions === 0}
          tabIndex={totalQuestions === 0 ? -1 : undefined}
          className={totalQuestions === 0 ? "opacity-50 pointer-events-none" : undefined}
          pendingClassName="opacity-60"
        >
          問題を解く
        </NavLink>
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
            <div className="text-2xl font-bold">{todayAnswers}</div>
            <div className="text-xs text-text/60">本日の解答数</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Math.round(todayAccuracy * 100)}%</div>
            <div className="text-xs text-text/60">本日の正答率</div>
          </div>
        </div>
      </section>
    </main>
  );
}
