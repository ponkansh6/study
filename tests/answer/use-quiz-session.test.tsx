import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useQuizSession } from "@/app/answer/use-quiz-session";

describe("useQuizSession hook", () => {
  const mockQuestion = {
    id: 1,
    question: "Test Question?",
    choices: ["A", "B", "C", "D"],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("1. Initial load -> question", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockQuestion,
      })
    );

    const { result } = renderHook(() => useQuizSession());

    expect(result.current.phase.kind).toBe("loading");

    await waitFor(() => {
      expect(result.current.phase.kind).toBe("question");
    });

    if (result.current.phase.kind === "question") {
      expect(result.current.phase.quiz.question).toEqual(mockQuestion);
      expect(result.current.phase.quiz.shuffled.choices).toHaveLength(4);
    }
  });

  it("2. 404 -> empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      })
    );

    const { result } = renderHook(() => useQuizSession());

    await waitFor(() => {
      expect(result.current.phase.kind).toBe("empty");
    });
  });

  it("3. Error -> error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const { result } = renderHook(() => useQuizSession());

    await waitFor(() => {
      expect(result.current.phase.kind).toBe("error");
    });

    if (result.current.phase.kind === "error") {
      expect(result.current.phase.message).toBe("Network failure");
    }
  });

  it("4. select correct -> graded", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/questions/random")) {
        return {
          ok: true,
          json: async () => mockQuestion,
        };
      }
      if (url.includes("/api/answers")) {
        return {
          ok: true,
          json: async () => ({
            isCorrect: true,
            correctIndex: 0,
            explanation: "Correct explanation",
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQuizSession());

    await waitFor(() => {
      expect(result.current.phase.kind).toBe("question");
    });

    const quizPhase = result.current.phase;
    if (quizPhase.kind !== "question") throw new Error("Expected question phase");

    // Find index of choiceIndices that corresponds to original index 0
    const originalIndex = 0;
    const shuffledIdx = quizPhase.quiz.shuffled.choiceIndices.indexOf(originalIndex);

    await act(async () => {
      await result.current.select(shuffledIdx);
    });

    expect(result.current.phase.kind).toBe("graded");
    if (result.current.phase.kind === "graded") {
      expect(result.current.phase.result.isCorrect).toBe(true);
      expect(result.current.phase.result.explanation).toBe("Correct explanation");
    }

    expect(result.current.score).toEqual({ correct: 1, total: 1 });
  });

  it("5. select wrong -> graded", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/questions/random")) {
        return {
          ok: true,
          json: async () => mockQuestion,
        };
      }
      if (url.includes("/api/answers")) {
        return {
          ok: true,
          json: async () => ({
            isCorrect: false,
            correctIndex: 0,
            explanation: "Wrong explanation",
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQuizSession());

    await waitFor(() => {
      expect(result.current.phase.kind).toBe("question");
    });

    const quizPhase = result.current.phase;
    if (quizPhase.kind !== "question") throw new Error("Expected question phase");

    await act(async () => {
      await result.current.select(0);
    });

    expect(result.current.phase.kind).toBe("graded");
    expect(result.current.score).toEqual({ correct: 0, total: 1 });
  });

  it("6. loadNext after graded -> loading then question with exclude param", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/questions/random")) {
        const id = url.includes("exclude=1") ? 2 : 1;
        return {
          ok: true,
          json: async () => ({ ...mockQuestion, id }),
        };
      }
      if (url.includes("/api/answers")) {
        return {
          ok: true,
          json: async () => ({
            isCorrect: true,
            correctIndex: 0,
            explanation: "Exp",
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQuizSession());

    await waitFor(() => {
      expect(result.current.phase.kind).toBe("question");
    });

    await act(async () => {
      await result.current.select(0);
    });

    expect(result.current.phase.kind).toBe("graded");

    await act(async () => {
      await result.current.loadNext();
    });

    // Check that fetch was called with exclude=1
    const randomCalls = fetchMock.mock.calls.filter((call) =>
      typeof call[0] === "string" && call[0].includes("/api/questions/random")
    );
    const lastCallUrl = randomCalls[randomCalls.length - 1][0] as string;
    expect(lastCallUrl).toContain("exclude=1");
  });
});
