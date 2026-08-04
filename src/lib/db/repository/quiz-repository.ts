import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { quizSets, questions } from "../schema";

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

export interface CreateQuizSetInput {
  title: string;
  sourceText: string;
  questions: QuizQuestion[];
}

export async function createQuizSet(input: CreateQuizSetInput) {
  return db.transaction(async (tx) => {
    const [result] = await tx.insert(quizSets).values({
      title: input.title,
      sourceText: input.sourceText,
    }).returning({ id: quizSets.id });

    if (!result) throw new Error("Failed to create quiz set");

    const questionsData = input.questions.map((q, idx) => ({
      quizSetId: result.id,
      orderIndex: idx,
      question: q.question,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation || null,
    }));

    await tx.insert(questions).values(questionsData);

    return result.id;
  });
}

export async function getQuizSet(id: number) {
  const [quizSet] = await db.select().from(quizSets).where(eq(quizSets.id, id));

  if (!quizSet) return null;

  const questionsList = await db
    .select()
    .from(questions)
    .where(eq(questions.quizSetId, id))
    .orderBy(questions.orderIndex);

  return {
    ...quizSet,
    questions: questionsList.map((q) => ({
      id: q.id,
      question: q.question,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  };
}

export async function listQuizSets(limit = 20) {
  return db
    .select({
      id: quizSets.id,
      title: quizSets.title,
      createdAt: quizSets.createdAt,
    })
    .from(quizSets)
    .orderBy((t) => t.createdAt)
    .limit(limit);
}
