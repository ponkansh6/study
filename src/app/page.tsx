import { NavLink } from "@/components/NavLink";
import { getStats } from "@/lib/db/repository/answer-repository";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { totalQuestions, todayAnswers, todayAccuracy } = await getStats();

  return (
    <main className="py-12 space-y-10 flex-1 flex flex-col justify-center motion-safe:animate-rise">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Study
        </h1>
        <p className="text-muted text-base font-medium">1ナレッジ1問学習アプリ</p>
      </header>

      <section className="grid gap-3 max-w-md mx-auto w-full">
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
          <p className="text-center text-sm font-medium text-warning mt-1">
            まず問題を作ってください
          </p>
        )}
      </section>

      <section className="space-y-4 max-w-md mx-auto w-full">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted text-center">統計</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="問題数" value={String(totalQuestions)} />
          <StatCard label="本日の解答数" value={String(todayAnswers)} />
          <StatCard
            label="本日の正答率"
            value={`${Math.round(todayAccuracy * 100)}%`}
            progress={todayAccuracy}
          />
        </div>
      </section>
    </main>
  );
}
