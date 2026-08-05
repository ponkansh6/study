import { eq, count } from "drizzle-orm";
import { db } from "../index";
import { answerLogs, questions } from "../schema";

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
  const [qCountResult] = await db.select({ count: count(questions.id) }).from(questions);
  const [aCountResult] = await db.select({ count: count(answerLogs.id) }).from(answerLogs);
  const [correctCountResult] = await db
    .select({ count: count(answerLogs.id) })
    .from(answerLogs)
    .where(eq(answerLogs.isCorrect, 1));

  const totalQuestions = Number(qCountResult?.count ?? 0);
  const totalAnswers = Number(aCountResult?.count ?? 0);
  const totalCorrect = Number(correctCountResult?.count ?? 0);

  const overallAccuracy = totalAnswers > 0 ? totalCorrect / totalAnswers : 0;

  return {
    totalQuestions,
    totalAnswers,
    overallAccuracy,
  };
}
