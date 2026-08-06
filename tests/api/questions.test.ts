import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/questions/route";
import { generateQuestion } from "@/lib/llm/quiz";
import { createKnowledgeWithQuestion } from "@/lib/db/repository/question-repository";

vi.mock("@/lib/llm/quiz", () => ({
  generateQuestion: vi.fn(),
}));

vi.mock("@/lib/db/repository/question-repository", () => ({
  createKnowledgeWithQuestion: vi.fn(),
}));

describe("POST /api/questions", () => {
  it("should create a question successfully and return 201", async () => {
    vi.mocked(generateQuestion).mockResolvedValueOnce({
      question: "What is 2+2?",
      choices: ["1", "2", "3", "4"],
      correctIndex: 3,
      explanation: "2 + 2 = 4",
    });

    vi.mocked(createKnowledgeWithQuestion).mockResolvedValueOnce({
      knowledgeId: 1,
      questionId: 10,
    });

    const request = new Request("http://localhost/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText: "Math basics: 2+2=4" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      id: 10,
      knowledgeId: 1,
      question: "What is 2+2?",
      choices: ["1", "2", "3", "4"],
      correctIndex: 3,
      explanation: "2 + 2 = 4",
    });
    expect(createKnowledgeWithQuestion).toHaveBeenCalledTimes(1);
  });

  it("should return 400 when sourceText is empty string", async () => {
    const request = new Request("http://localhost/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText: "" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
    expect(generateQuestion).not.toHaveBeenCalled();
    expect(createKnowledgeWithQuestion).not.toHaveBeenCalled();
  });

  it("should return 400 when sourceText is missing", async () => {
    const request = new Request("http://localhost/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
    expect(generateQuestion).not.toHaveBeenCalled();
    expect(createKnowledgeWithQuestion).not.toHaveBeenCalled();
  });

  it("should return 500 when LLM generateQuestion returns null", async () => {
    vi.mocked(generateQuestion).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText: "Valid source text" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(generateQuestion).toHaveBeenCalledTimes(1);
    expect(createKnowledgeWithQuestion).not.toHaveBeenCalled();
  });
});
