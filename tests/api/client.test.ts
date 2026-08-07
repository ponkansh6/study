import { describe, it, expect, vi } from "vitest";
import {
  fetchRandomQuestion,
  submitAnswer,
  createQuestion,
  deleteQuestion,
} from "@/lib/api/client";

describe("api client", () => {
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
    await expect(fetchRandomQuestion([])).rejects.toThrow(
      "Failed to fetch random question: status 502",
    );
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

  it("submitAnswer throws error body message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "回答の保存に失敗しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(submitAnswer(1, 0)).rejects.toThrow("回答の保存に失敗しました");
  });

  it("submitAnswer throws fallback message on non-JSON non-ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));
    await expect(submitAnswer(1, 0)).rejects.toThrow("Failed to submit answer: status 502");
  });

  it("createQuestion throws error body message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "サーバで問題が発生しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(createQuestion("test")).rejects.toThrow("サーバで問題が発生しました");
  });

  it("createQuestion uses customErrorMsg fallback when body has no error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );
    await expect(createQuestion("test")).rejects.toThrow("生成に失敗しました");
  });

  it.each([["データベースエラーが発生しました"], ["LLM の応答が不正です"]])(
    "createQuestion prefers error body message (%s) over customErrorMsg",
    async (bodyMsg) => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: bodyMsg }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
      await expect(createQuestion("test")).rejects.toThrow(bodyMsg);
    },
  );

  it("deleteQuestion calls DELETE with correct URL and resolves on success", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(deleteQuestion(42)).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith("/api/questions/42", { method: "DELETE" });
  });

  it("deleteQuestion resolves on 404 (idempotent)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(deleteQuestion(42)).resolves.toBeUndefined();
  });

  it("deleteQuestion throws server message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "削除に失敗しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(deleteQuestion(42)).rejects.toThrow("削除に失敗しました");
  });

  it("deleteQuestion throws schema error on invalid response json", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(deleteQuestion(42)).rejects.toThrow("Invalid response schema");
  });
});
