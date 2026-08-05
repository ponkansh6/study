import { QuizQuestion, AnswerResult } from "@/types/quiz";

async function parseJsonOrThrow(res: Response, errorMessage: string) {
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(errorMessage);
  }
  return data;
}

export async function fetchRandomQuestion(excludeIds: number[]): Promise<QuizQuestion | null> {
  const res = await fetch(`/api/questions/random?exclude=${excludeIds.join(",")}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch random question: ${res.statusText}`);
  }
  return parseJsonOrThrow(res, "Unexpected response");
}

export async function submitAnswer(
  questionId: number,
  selectedIndex: number,
): Promise<AnswerResult> {
  const res = await fetch("/api/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, selectedIndex }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit answer: ${res.statusText}`);
  }
  return parseJsonOrThrow(res, "Unexpected response");
}

export async function createQuestion(sourceText: string) {
  const res = await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create question: ${res.statusText}`);
  }
  return parseJsonOrThrow(res, "Unexpected response");
}
