import { z } from "zod";
import { QuizQuestion, AnswerResult } from "@/types/quiz";

export const quizQuestionSchema = z.object({
  id: z.number(),
  question: z.string(),
  choices: z.array(z.string()),
});

export const answerResultSchema = z.object({
  isCorrect: z.boolean(),
  correctIndex: z.number(),
  explanation: z.string().nullable(),
});

export const createdQuestionSchema = z.object({
  id: z.number(),
  knowledgeId: z.number(),
  question: z.string(),
  choices: z.array(z.string()),
  correctIndex: z.number(),
  explanation: z.string().nullable(),
});

export type CreatedQuestion = z.infer<typeof createdQuestionSchema>;

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const json = await res.json();
    if (json && typeof json === "object" && "error" in json && typeof json.error === "string") {
      return json.error;
    }
  } catch {
    // non-JSON body, fall back
  }
  return null;
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  label: string,
  schema: z.ZodType<T>,
  customErrorMsg?: string,
): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const fallback = `Failed to ${label}: status ${res.status}`;
    const errorMsg = (await readErrorMessage(res)) ?? customErrorMsg ?? fallback;
    throw new Error(errorMsg);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Failed to parse response from ${label}`);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid response schema for ${label}: ${parsed.error.message}`);
  }

  return parsed.data;
}

export async function fetchRandomQuestion(excludeIds: number[]): Promise<QuizQuestion | null> {
  const query = excludeIds.length > 0 ? `?exclude=${excludeIds.join(",")}` : "";
  const res = await fetch(`/api/questions/random${query}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const fallback = `Failed to fetch random question: status ${res.status}`;
    const errorMsg = (await readErrorMessage(res)) ?? fallback;
    throw new Error(errorMsg);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Unexpected response");
  }

  const parsed = quizQuestionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid response schema");
  }
  return parsed.data;
}

export async function submitAnswer(
  questionId: number,
  selectedIndex: number,
): Promise<AnswerResult> {
  return request(
    "/api/answers",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, selectedIndex }),
    },
    "submit answer",
    answerResultSchema,
  );
}

export async function createQuestion(sourceText: string): Promise<CreatedQuestion> {
  return request(
    "/api/questions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText }),
    },
    "create question",
    createdQuestionSchema,
    "生成に失敗しました",
  );
}
