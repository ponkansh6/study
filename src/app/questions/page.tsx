import { listQuestions } from "@/lib/db/repository/question-repository";
import { formatJstDate } from "@/lib/date";
import { QuestionList } from "./question-list";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const items = await listQuestions();
  const formattedItems = items.map((item) => ({
    ...item,
    createdAt: formatJstDate(item.createdAt),
  }));

  return (
    <main className="py-8 space-y-7 flex-1 flex flex-col motion-safe:animate-rise">
      <header className="space-y-2 border-b border-border pb-5">
        <p className="text-xs font-bold tracking-[0.16em] text-primary">STUDY / LIBRARY</p>
        <h1 className="text-3xl font-bold tracking-tight">問題一覧</h1>
        <p className="text-sm text-muted leading-relaxed">
          作成した問題を見返したり、不要な問題を整理できます。
        </p>
      </header>
      <QuestionList initialItems={formattedItems} />
    </main>
  );
}
