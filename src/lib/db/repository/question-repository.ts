import { eq, desc, count, sql } from "drizzle-orm";
import { db } from "../index";
import { knowledge, questions, answerLogs } from "../schema";
import { QuestionForAnswering, Question } from "@/types/quiz";

export interface CreateKnowledgeInput {
  title: string;
  sourceText: string;
  question: {
    question: string;
    choices: string[];
    correctIndex: number;
    explanation?: string;
  };
}

export async function createKnowledgeWithQuestion(input: CreateKnowledgeInput) {
  return db.transaction(async (tx) => {
    const [kResult] = await tx
      .insert(knowledge)
      .values({
        title: input.title,
        sourceText: input.sourceText,
      })
      .returning({ id: knowledge.id });

    if (!kResult) throw new Error("Failed to create knowledge");

    const [qResult] = await tx
      .insert(questions)
      .values({
        knowledgeId: kResult.id,
        question: input.question.question,
        choices: input.question.choices,
        correctIndex: input.question.correctIndex,
        explanation: input.question.explanation || null,
      })
      .returning({ id: questions.id });

    if (!qResult) throw new Error("Failed to create question");

    return {
      knowledgeId: kResult.id,
      questionId: qResult.id,
    };
  });
}

export async function getQuestionById(id: number): Promise<Question | null> {
  const [q] = await db.select().from(questions).where(eq(questions.id, id));
  if (!q) return null;
  return {
    id: q.id,
    knowledgeId: q.knowledgeId,
    question: q.question,
    choices: q.choices,
    correctIndex: q.correctIndex,
    explanation: q.explanation ?? undefined,
    createdAt: q.createdAt,
  };
}

/**
 * Scale note:
 * 苦手優先ランダムのアルゴリズムは、問題数が数千件規模になったら SQL 側での抽選に切り替える必要がある。
 * プロトタイプ規模では全件取得で問題ない。
 * また、現行の実装では全件の answerLogs を取得してアプリケーション側で最新の解答を判定しているため、
 * 将来的にログ件数が増加した場合は、ROW_NUMBER() ウィンドウ関数やサブクエリを用いて各問題の最新ログのみを
 * SQL側で効率的に取得する実装に切り替える必要がある。
 */
export async function pickWeightedRandomQuestion(
  excludeIds: number[] = [],
): Promise<QuestionForAnswering | null> {
  // Fetch all questions
  const allQuestions = await db.select().from(questions);
  if (allQuestions.length === 0) return null;

  // Fetch stats for all questions using a subquery or group by
  // We want for each question: totalAnswers, incorrectAnswers, latestIsCorrect
  // Since SQLite support is straightforward, let's fetch answer logs or aggregate via SQL.
  // Actually, we can fetch all answer logs or use an aggregated query.
  const statsRows = await db
    .select({
      questionId: answerLogs.questionId,
      totalAnswers: count(answerLogs.id),
      incorrectAnswers: sql<number>`sum(case when ${answerLogs.isCorrect} = 0 then 1 else 0 end)`,
    })
    .from(answerLogs)
    .groupBy(answerLogs.questionId);

  const statsMap = new Map<number, { totalAnswers: number; incorrectAnswers: number }>();
  for (const row of statsRows) {
    statsMap.set(row.questionId, {
      totalAnswers: Number(row.totalAnswers),
      incorrectAnswers: Number(row.incorrectAnswers),
    });
  }

  // Get latest answer log for each question to check if latest is incorrect
  // We can query all answer logs ordered by answeredAt desc, or use window function if supported, or just fetch all answer logs.
  // Since logs might be moderate, let's fetch all answer logs ordered by answeredAt desc, then pick the first seen for each questionId.
  const allLogs = await db
    .select({
      questionId: answerLogs.questionId,
      isCorrect: answerLogs.isCorrect,
      answeredAt: answerLogs.answeredAt,
    })
    .from(answerLogs)
    .orderBy(desc(answerLogs.answeredAt));

  const latestCorrectMap = new Map<number, boolean>();
  for (const log of allLogs) {
    if (!latestCorrectMap.has(log.questionId)) {
      latestCorrectMap.set(log.questionId, log.isCorrect === 1);
    }
  }

  // Filter by excludeIds first
  let candidates = allQuestions.filter((q) => !excludeIds.includes(q.id));
  if (candidates.length === 0) {
    // Fallback: ignore excludeIds if 0 candidates left
    candidates = allQuestions;
  }

  if (candidates.length === 0) return null;

  // Calculate weights
  const weightedList: { question: (typeof allQuestions)[number]; weight: number }[] = [];

  for (const q of candidates) {
    const stat = statsMap.get(q.id);
    let weight = 5; // default for un-answered
    if (stat && stat.totalAnswers > 0) {
      const incorrectRatio = stat.incorrectAnswers / stat.totalAnswers;
      weight = 1 + 4 * incorrectRatio;
    }

    const latestCorrect = latestCorrectMap.get(q.id);
    if (latestCorrect === false) {
      weight += 2;
    }

    weightedList.push({ question: q, weight });
  }

  // Weighted random selection
  const totalWeight = weightedList.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of weightedList) {
    if (randomVal < item.weight) {
      return {
        id: item.question.id,
        question: item.question.question,
        choices: item.question.choices,
      };
    }
    randomVal -= item.weight;
  }

  // Fallback to first candidate
  const fallback = candidates[0];
  return fallback
    ? {
        id: fallback.id,
        question: fallback.question,
        choices: fallback.choices,
      }
    : null;
}

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
