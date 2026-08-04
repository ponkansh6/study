import { callGemini } from "./client";
import { parseWithRetry } from "./parser";
import { QuizGenerationSchema, QuizQuestion } from "./schemas";
import { LLM_QUIZ_MAX_TOKENS, LLM_QUIZ_TIMEOUT_MS } from "../constants";
import { QUIZ_GENERATION_PROMPT } from "./prompts";

export async function generateQuizQuestions(sourceText: string): Promise<QuizQuestion[] | null> {
  const prompt = QUIZ_GENERATION_PROMPT.replace("{{SOURCE_TEXT}}", sourceText);

  const result = await parseWithRetry(
    () => callGemini(prompt, LLM_QUIZ_MAX_TOKENS, LLM_QUIZ_TIMEOUT_MS),
    QuizGenerationSchema,
    "quiz-generation",
  );

  return result ?? null;
}
