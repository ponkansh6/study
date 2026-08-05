import type { knowledge, questions, answerLogs } from "@/lib/db/schema";

export type Knowledge = typeof knowledge.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type AnswerLog = typeof answerLogs.$inferSelect;

export interface QuizQuestion {
  id: number;
  question: string;
  choices: string[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation?: string;
}
