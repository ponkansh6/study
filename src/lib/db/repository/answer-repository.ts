import { and, gte, eq, count } from "drizzle-orm";
import { db } from "../index";
import { answerLogs, questions } from "../schema";
import { jstDayStart } from "../../date";

export async function recordAnswer(input: {
  questionId: number;
  selectedIndex: number;
  isCorrect: boolean;
}) {
  await db.insert(answerLogs).values({
    questionId: input.questionId,
    selectedIndex: input.selectedIndex,
    isCorrect: input.isCorrect ? 1 : 0,
  });
}

export async function getStats() {
  const dayStart = jstDayStart();
  const [qCountResult] = await db.select({ count: count(questions.id) }).from(questions);
  const [aCountResult] = await db
    .select({ count: count(answerLogs.id) })
    .from(answerLogs)
    .where(gte(answerLogs.answeredAt, dayStart));
  const [correctCountResult] = await db
    .select({ count: count(answerLogs.id) })
    .from(answerLogs)
    .where(and(eq(answerLogs.isCorrect, 1), gte(answerLogs.answeredAt, dayStart)));

  const totalQuestions = Number(qCountResult?.count ?? 0);
  const todayAnswers = Number(aCountResult?.count ?? 0);
  const todayCorrect = Number(correctCountResult?.count ?? 0);

  const todayAccuracy = todayAnswers > 0 ? todayCorrect / todayAnswers : 0;

  return {
    totalQuestions,
    todayAnswers,
    todayAccuracy,
  };
}
