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
    <main className="py-8 space-y-6 flex-1 flex flex-col motion-safe:animate-rise">
      <h1 className="text-2xl font-bold tracking-tight">問題一覧</h1>
      <QuestionList initialItems={formattedItems} />
    </main>
  );
}
