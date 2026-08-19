import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/questions/[id]/regenerate/route";
import {
  getQuestionSource,
  replaceKnowledgeWithQuestion,
} from "@/lib/db/repository/question-repository";
import { generateQuestion } from "@/lib/llm/quiz";

vi.mock("@/lib/db/repository/question-repository", () => ({
  getQuestionSource: vi.fn(),
  replaceKnowledgeWithQuestion: vi.fn(),
}));

vi.mock("@/lib/llm/quiz", () => ({
  generateQuestion: vi.fn(),
}));

describe("POST /api/questions/[id]/regenerate", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Normal: valid id and difficulty, gets source, generates, replaces -> status 200 and created question", async () => {
    vi.mocked(getQuestionSource).mockResolvedValueOnce({
      title: "Sample Title",
      sourceText: "Sample Source",
    });
    vi.mocked(generateQuestion).mockResolvedValueOnce({
      question: "Refined Question?",
      choices: ["A", "B", "C", "D"],
      correctIndex: 2,
      explanation: "Refined explanation",
    });
    vi.mocked(replaceKnowledgeWithQuestion).mockResolvedValueOnce({
      knowledgeId: 10,
      questionId: 5,
    });

    const request = new Request("http://localhost/api/questions/1/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: 2 }),
    });

    const response = await POST(request, ctx("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: 5,
      knowledgeId: 10,
      question: "Refined Question?",
      choices: ["A", "B", "C", "D"],
      correctIndex: 2,
      explanation: "Refined explanation",
    });
    expect(getQuestionSource).toHaveBeenCalledWith(1);
    expect(generateQuestion).toHaveBeenCalledWith("Sample Source", 2);
    expect(replaceKnowledgeWithQuestion).toHaveBeenCalledWith({
      replaceQuestionId: 1,
      title: "Sample Title",
      sourceText: "Sample Source",
      question: {
        question: "Refined Question?",
        choices: ["A", "B", "C", "D"],
        correctIndex: 2,
        explanation: "Refined explanation",
      },
    });
  });

  it.each([["abc"], ["0"], ["-1"]])(
    "2. Invalid question id (%s) -> status 400 and repository/LLM not called",
    async (invalidId) => {
      const request = new Request(`http://localhost/api/questions/${invalidId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: 2 }),
      });

      const response = await POST(request, ctx(invalidId));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "Invalid question id");
      expect(getQuestionSource).not.toHaveBeenCalled();
      expect(generateQuestion).not.toHaveBeenCalled();
    },
  );

  it.each([1, 6, "2", null, undefined])(
    "3. Invalid difficulty (%p) -> status 400 and generate/replace not called",
    async (invalidDiff) => {
      const request = new Request("http://localhost/api/questions/1/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: invalidDiff }),
      });

      const response = await POST(request, ctx("1"));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "Invalid difficulty");
      expect(getQuestionSource).not.toHaveBeenCalled();
      expect(generateQuestion).not.toHaveBeenCalled();
    },
  );

  it("4. Question source not found -> status 404 and generateQuestion NOT called", async () => {
    vi.mocked(getQuestionSource).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/questions/999/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: 2 }),
    });

    const response = await POST(request, ctx("999"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error", "Question not found");
    expect(generateQuestion).not.toHaveBeenCalled();
    expect(replaceKnowledgeWithQuestion).not.toHaveBeenCalled();
  });

  it("5. LLM generate returns null -> status 500 and replaceKnowledgeWithQuestion NOT called", async () => {
    vi.mocked(getQuestionSource).mockResolvedValueOnce({
      title: "Title",
      sourceText: "Source",
    });
    vi.mocked(generateQuestion).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/questions/1/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: 2 }),
    });

    const response = await POST(request, ctx("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error", "Failed to generate question from LLM");
    expect(replaceKnowledgeWithQuestion).not.toHaveBeenCalled();
  });

  it("6. Replace knowledge returns null -> status 404", async () => {
    vi.mocked(getQuestionSource).mockResolvedValueOnce({
      title: "Title",
      sourceText: "Source",
    });
    vi.mocked(generateQuestion).mockResolvedValueOnce({
      question: "Q?",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
    });
    vi.mocked(replaceKnowledgeWithQuestion).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/questions/1/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: 2 }),
    });

    const response = await POST(request, ctx("1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error", "Question not found");
  });

  it("7. Repository/LLM rejects -> status 500 with spy console.error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getQuestionSource).mockRejectedValueOnce(new Error("DB crash"));

    const request = new Request("http://localhost/api/questions/1/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: 2 }),
    });

    const response = await POST(request, ctx("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error", "Internal server error");
    consoleErrorSpy.mockRestore();
  });
});
