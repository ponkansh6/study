import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRandomQuestion, submitAnswer, createQuestion } from "@/lib/api/client";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchRandomQuestion returns null on 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 404 }));
    const result = await fetchRandomQuestion([1]);
    expect(result).toBeNull();
  });

  it("fetchRandomQuestion throws error body message on non-ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Custom error message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(fetchRandomQuestion([])).rejects.toThrow("Custom error message");
  });

  it("fetchRandomQuestion throws fallback message on non-JSON non-ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));
    await expect(fetchRandomQuestion([])).rejects.toThrow();
  });

  it("fetchRandomQuestion returns QuizQuestion on success", async () => {
    const q = { id: 1, question: "Q1", choices: ["A", "B", "C", "D"] };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(q), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await fetchRandomQuestion([]);
    expect(result).toEqual(q);
  });

  it("submitAnswer returns AnswerResult on success", async () => {
    const ans = { isCorrect: true, correctIndex: 0, explanation: null };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(ans), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await submitAnswer(1, 0);
    expect(result).toEqual(ans);
  });

  it("createQuestion throws error body message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "生成に失敗しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(createQuestion("test")).rejects.toThrow("生成に失敗しました");
  });
});
