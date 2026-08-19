import { callGemini } from "./client";
import { parseWithRetry } from "./parser";
import { QuizQuestionSchema, GeneratedQuestion } from "./schemas";
import {
  LLM_QUIZ_MAX_TOKENS,
  LLM_QUIZ_MAX_TOKENS_HARD,
  LLM_QUIZ_TIMEOUT_MS,
  QUIZ_MIN_DIFFICULTY,
} from "../constants";
import { buildQuizPrompt } from "./prompts";

export async function generateQuestion(
  sourceText: string,
  difficulty: number = QUIZ_MIN_DIFFICULTY,
): Promise<GeneratedQuestion | null> {
  const prompt = buildQuizPrompt(sourceText, difficulty);
  const maxTokens = difficulty >= 2 ? LLM_QUIZ_MAX_TOKENS_HARD : LLM_QUIZ_MAX_TOKENS;

  const result = await parseWithRetry(
    () => callGemini(prompt, maxTokens, LLM_QUIZ_TIMEOUT_MS),
    QuizQuestionSchema,
    "question-generation",
  );

  return result ?? null;
}
