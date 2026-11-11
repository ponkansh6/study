import { NavLink } from "@/components/NavLink";
import { getStats } from "@/lib/db/repository/answer-repository";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { totalQuestions, todayAnswers, todayAccuracy } = await getStats();

  return (
    <main className="w-full max-w-xl mx-auto py-10 sm:py-16 space-y-10 sm:space-y-14 flex-1 flex flex-col motion-safe:animate-rise">
      <header className="space-y-4 border-l-2 border-primary pl-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">DAILY PRACTICE</p>
        <h1 className="text-3xl sm:text-[2.6rem] font-semibold tracking-tight leading-tight">
          知識を、
          <br className="sm:hidden" />
          一問ずつ身につける。
        </h1>
        <p className="text-muted text-sm sm:text-base">
          ナレッジから問題を作り、繰り返し解いて定着させましょう。
        </p>
      </header>

      <section aria-labelledby="study-actions-heading" className="space-y-3">
        <h2 id="study-actions-heading" className="sr-only">
          学習メニュー
        </h2>
        <NavLink
          href="/answer"
          className={`group flex min-h-16 items-center justify-between px-5 text-left text-base ${totalQuestions === 0 ? "opacity-50 pointer-events-none" : ""}`}
          aria-disabled={totalQuestions === 0}
          tabIndex={totalQuestions === 0 ? -1 : undefined}
          pendingClassName="opacity-60"
        >
          <span className="flex flex-col items-start gap-0.5">
            <span>学習をはじめる</span>
            <span className="text-xs font-normal opacity-80">苦手な問題から取り組む</span>
          </span>
          <span
            aria-hidden="true"
            className="text-lg transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </NavLink>
        {totalQuestions === 0 && (
          <p className="text-sm text-warning">学習を始めるには、まず問題を作成してください。</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NavLink
            href="/create"
            variant="outline"
            className="min-h-12"
            pendingClassName="opacity-60"
          >
            問題を作る <span aria-hidden="true">＋</span>
          </NavLink>
          <NavLink
            href="/questions"
            variant="ghost"
            className="min-h-12 border border-border"
            pendingClassName="opacity-60"
          >
            問題一覧
          </NavLink>
        </div>
      </section>

      <section
        aria-labelledby="study-stats-heading"
        className="space-y-3 border-t border-border pt-5"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="study-stats-heading" className="text-sm font-semibold">
            学習の記録
          </h2>
          <span className="text-xs text-muted">今日</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-y border-border py-4">
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
