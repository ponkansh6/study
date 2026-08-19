import { eq, count, sql, desc } from "drizzle-orm";
import { db } from "../index";
import { knowledge, questions, answerLogs } from "../schema";
import { QuizQuestion, Question } from "@/types/quiz";
import { computeWeight, pickByWeight } from "./weighting";

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

export interface QuestionSource {
  title: string;
  sourceText: string;
}

export interface ReplaceKnowledgeInput extends CreateKnowledgeInput {
  replaceQuestionId: number;
}

async function insertKnowledgeAndQuestion(tx: any, input: CreateKnowledgeInput) {
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
}

export async function createKnowledgeWithQuestion(input: CreateKnowledgeInput) {
  return db.transaction(async (tx) => {
    return insertKnowledgeAndQuestion(tx, input);
  });
}

export async function getQuestionSource(questionId: number): Promise<QuestionSource | null> {
  const rows = await db
    .select({
      title: knowledge.title,
      sourceText: knowledge.sourceText,
    })
    .from(questions)
    .innerJoin(knowledge, eq(questions.knowledgeId, knowledge.id))
    .where(eq(questions.id, questionId));
  const row = rows[0];
  if (!row) return null;
  return {
    title: row.title,
    sourceText: row.sourceText,
  };
}

export async function replaceKnowledgeWithQuestion(
  input: ReplaceKnowledgeInput,
): Promise<{ knowledgeId: number; questionId: number } | null> {
  return db.transaction(async (tx) => {
    const [q] = await tx
      .select({ id: questions.id, knowledgeId: questions.knowledgeId })
      .from(questions)
      .where(eq(questions.id, input.replaceQuestionId));
    if (!q) return null;

    const newRes = await insertKnowledgeAndQuestion(tx, input);

    await tx.delete(answerLogs).where(eq(answerLogs.questionId, input.replaceQuestionId));
    await tx.delete(questions).where(eq(questions.id, input.replaceQuestionId));
    await tx.delete(knowledge).where(eq(knowledge.id, q.knowledgeId));

    return newRes;
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
 * 統計情報は answer_logs の集計（正誤比率 + 絶対回数 + max(answered_at)）および相関サブクエリで取得する。
 * 重み付けは 4 軸の乗算（accuracy × miss bonus × mastery decay × recency）で計算する。
 */
export async function pickWeightedRandomQuestion(
  excludeIds: number[] = [],
): Promise<QuizQuestion | null> {
  const now = new Date();
  // Project only the columns the picker needs instead of pulling every row ×
  // every column (question text + choices JSON + explanation) from Turso.
  // The stats query is independent, so run both in parallel.
  const [allQuestions, statsRows] = await Promise.all([
    db
      .select({
        id: questions.id,
        question: questions.question,
        choices: questions.choices,
      })
      .from(questions),
    db
      .select({
        questionId: answerLogs.questionId,
        totalAnswers: count(answerLogs.id),
        incorrectAnswers: sql<number>`sum(case when ${answerLogs.isCorrect} = 0 then 1 else 0 end)`,
        latestIsCorrect: sql<number>`(
        SELECT l2.is_correct FROM answer_logs AS l2
        WHERE l2.question_id = ${answerLogs.questionId}
        ORDER BY l2.answered_at DESC, l2.id DESC LIMIT 1
      )`,
        lastAnsweredAt: sql<number>`max(${answerLogs.answeredAt})`,
      })
      .from(answerLogs)
      .groupBy(answerLogs.questionId),
  ]);
  if (allQuestions.length === 0) return null;

  const statsMap = new Map<
    number,
    {
      totalAnswers: number;
      incorrectAnswers: number;
      latestCorrect: boolean;
      lastAnsweredAt: Date | null;
    }
  >();
  for (const row of statsRows) {
    const ts = Number(row.lastAnsweredAt);
    statsMap.set(row.questionId, {
      totalAnswers: Number(row.totalAnswers),
      incorrectAnswers: Number(row.incorrectAnswers),
      latestCorrect: Number(row.latestIsCorrect) === 1,
      lastAnsweredAt: Number.isFinite(ts) ? new Date(ts * 1000) : null,
    });
  }

  let candidates = allQuestions.filter((q) => !excludeIds.includes(q.id));
  if (candidates.length === 0) {
    candidates = allQuestions;
  }

  if (candidates.length === 0) return null;

  const weightedList = candidates.map((q) => {
    const stat = statsMap.get(q.id);
    const weight = computeWeight(
      stat
        ? {
            answered: stat.totalAnswers,
            incorrect: stat.incorrectAnswers,
            latestIncorrect: !stat.latestCorrect,
            lastAnsweredAt: stat.lastAnsweredAt,
          }
        : null,
      now,
    );
    return { item: q, weight };
  });

  const picked = pickByWeight(weightedList);
  if (!picked) {
    const fallback = candidates[0];
    return fallback
      ? {
          id: fallback.id,
          question: fallback.question,
          choices: fallback.choices,
        }
      : null;
  }

  return {
    id: picked.id,
    question: picked.question,
    choices: picked.choices,
  };
}

export interface QuestionListItem {
  id: number;
  question: string;
  createdAt: Date;
}

export async function listQuestions(): Promise<QuestionListItem[]> {
  return db
    .select({
      id: questions.id,
      question: questions.question,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .orderBy(desc(questions.createdAt), desc(questions.id));
}

export async function deleteQuestion(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [q] = await tx
      .select({ id: questions.id, knowledgeId: questions.knowledgeId })
      .from(questions)
      .where(eq(questions.id, id));
    if (!q) return false;

    await tx.delete(answerLogs).where(eq(answerLogs.questionId, id));
    await tx.delete(questions).where(eq(questions.id, id));
    await tx.delete(knowledge).where(eq(knowledge.id, q.knowledgeId));

    return true;
  });
}
