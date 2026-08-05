import { eq, count, sql } from "drizzle-orm";
import { db } from "../index";
import { knowledge, questions, answerLogs } from "../schema";
import { QuizQuestion, Question } from "@/types/quiz";

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
    explanation: q.explanation,
    createdAt: q.createdAt,
  };
}

/**
 * Scale note:
 * 苦手優先ランダムのアルゴリズムは、問題数が数千件規模になったら SQL 側での抽選に切り替える必要がある。
 * プロトタイプ規模では全件取得で問題ない。
 * また、現行の実装では各問題の統計情報および相関サブクエリによる最新の解答状況を SQL 側（answerLogs の集計およびサブクエリ）
 * で効率的に取得するように最適化されている。
 */
export async function pickWeightedRandomQuestion(
  excludeIds: number[] = [],
): Promise<QuizQuestion | null> {
  const allQuestions = await db.select().from(questions);
  if (allQuestions.length === 0) return null;

  const statsRows = await db
    .select({
      questionId: answerLogs.questionId,
      totalAnswers: count(answerLogs.id),
      incorrectAnswers: sql<number>`sum(case when ${answerLogs.isCorrect} = 0 then 1 else 0 end)`,
      latestIsCorrect: sql<number>`(
        SELECT l2.is_correct FROM answer_logs AS l2
        WHERE l2.question_id = ${answerLogs.questionId}
        ORDER BY l2.answered_at DESC LIMIT 1
      )`,
    })
    .from(answerLogs)
    .groupBy(answerLogs.questionId);

  const statsMap = new Map<number, { totalAnswers: number; incorrectAnswers: number; latestCorrect: boolean }>();
  for (const row of statsRows) {
    statsMap.set(row.questionId, {
      totalAnswers: Number(row.totalAnswers),
      incorrectAnswers: Number(row.incorrectAnswers),
      latestCorrect: Number(row.latestIsCorrect) === 1,
    });
  }

  let candidates = allQuestions.filter((q) => !excludeIds.includes(q.id));
  if (candidates.length === 0) {
    candidates = allQuestions;
  }

  if (candidates.length === 0) return null;

  const weightedList: { question: (typeof allQuestions)[number]; weight: number }[] = [];

  for (const q of candidates) {
    const stat = statsMap.get(q.id);
    let weight = 5;
    if (stat && stat.totalAnswers > 0) {
      const incorrectRatio = stat.incorrectAnswers / stat.totalAnswers;
      weight = 1 + 4 * incorrectRatio;
    }

    if (stat && stat.latestCorrect === false) {
      weight += 2;
    }

    weightedList.push({ question: q, weight });
  }

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

  const fallback = candidates[0];
  return fallback
    ? {
        id: fallback.id,
        question: fallback.question,
        choices: fallback.choices,
      }
    : null;
}
