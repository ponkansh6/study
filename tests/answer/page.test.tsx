import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AnswerPage from "@/app/answer/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUseQuizSession = vi.hoisted(() => vi.fn());
vi.mock("@/app/answer/use-quiz-session", () => ({
  useQuizSession: () => mockUseQuizSession(),
}));

describe("AnswerPage", () => {
  it("renders QuizRunner", () => {
    mockUseQuizSession.mockReturnValue({
      phase: { kind: "loading" },
      score: { correct: 0, total: 0 },
      loadNext: vi.fn(),
      select: vi.fn(),
      loading: false,
    });
    render(<AnswerPage />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });
});
