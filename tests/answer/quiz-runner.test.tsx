import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuizRunner from "@/app/answer/quiz-runner";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseQuizSession = vi.hoisted(() => vi.fn());
vi.mock("@/app/answer/use-quiz-session", () => ({
  useQuizSession: () => mockUseQuizSession(),
}));

const basePhase = {
  question: "What is the capital of France?",
  choices: ["Paris", "London", "Berlin", "Madrid"],
  correctIndex: 0,
  explanation: "Paris is the capital.",
};

describe("QuizRunner", () => {
  beforeEach(() => {
    mockUseQuizSession.mockReset();
    mockPush.mockReset();
  });

  it("renders LoadingState when phase is loading", () => {
    mockUseQuizSession.mockReturnValue({
      phase: { kind: "loading" },
      score: { correct: 0, total: 0 },
      loadNext: vi.fn(),
      select: vi.fn(),
      loading: false,
    });
    render(<QuizRunner />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("renders EmptyState when phase is empty and pushes to /create", () => {
    mockUseQuizSession.mockReturnValue({
      phase: { kind: "empty" },
      score: { correct: 0, total: 0 },
      loadNext: vi.fn(),
      select: vi.fn(),
      loading: false,
    });
    render(<QuizRunner />);
    expect(screen.getByText("問題がまだありません。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "問題作成へ" }));
    expect(mockPush).toHaveBeenCalledWith("/create");
  });

  it("renders ErrorMessage when phase is error and retry calls loadNext", () => {
    const loadNext = vi.fn();
    mockUseQuizSession.mockReturnValue({
      phase: { kind: "error", message: "Something broke" },
      score: { correct: 0, total: 0 },
      loadNext,
      select: vi.fn(),
      loading: false,
    });
    render(<QuizRunner />);
    expect(screen.getByText("Something broke")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(loadNext).toHaveBeenCalled();
  });

  it("renders question with 4 choices in the question phase", () => {
    const select = vi.fn();
    mockUseQuizSession.mockReturnValue({
      phase: {
        kind: "question",
        quiz: {
          question: basePhase,
          shuffled: {
            choices: ["Paris", "London", "Berlin", "Madrid"],
            choiceIndices: [0, 1, 2, 3],
          },
        },
      },
      score: { correct: 0, total: 0 },
      loadNext: vi.fn(),
      select,
      loading: false,
    });
    render(<QuizRunner />);
    expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
    expect(screen.getByText("正解 0 / 0")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Paris"));
    expect(select).toHaveBeenCalledWith(0);
  });

  it("renders submitting phase with disabled choices", () => {
    mockUseQuizSession.mockReturnValue({
      phase: {
        kind: "submitting",
        selectedIndex: 1,
        quiz: {
          question: basePhase,
          shuffled: {
            choices: ["Paris", "London", "Berlin", "Madrid"],
            choiceIndices: [0, 1, 2, 3],
          },
        },
      },
      score: { correct: 0, total: 0 },
      loadNext: vi.fn(),
      select: vi.fn(),
      loading: false,
    });
    render(<QuizRunner />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
    // The selected button carries aria-busy.
    const selected = screen.getByText("London").closest("button");
    expect(selected).toHaveAttribute("aria-busy", "true");
  });

  it("renders graded phase with result banner, explanation, and next button", () => {
    const loadNext = vi.fn();
    mockUseQuizSession.mockReturnValue({
      phase: {
        kind: "graded",
        selectedIndex: 0,
        result: { isCorrect: true, correctIndex: 0, explanation: "Paris is the capital." },
        quiz: {
          question: basePhase,
          shuffled: {
            choices: ["Paris", "London", "Berlin", "Madrid"],
            choiceIndices: [0, 1, 2, 3],
          },
        },
      },
      score: { correct: 1, total: 1 },
      loadNext,
      select: vi.fn(),
      loading: false,
    });
    render(<QuizRunner />);
    expect(screen.getByText("正解！")).toBeInTheDocument();
    expect(screen.getByText(/解説: Paris is the capital\./)).toBeInTheDocument();
    expect(screen.getByText("正解 1 / 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));
    expect(loadNext).toHaveBeenCalled();
  });

  it("renders graded phase without explanation when explanation is null", () => {
    mockUseQuizSession.mockReturnValue({
      phase: {
        kind: "graded",
        selectedIndex: 0,
        result: { isCorrect: false, correctIndex: 1, explanation: null },
        quiz: {
          question: basePhase,
          shuffled: {
            choices: ["Paris", "London", "Berlin", "Madrid"],
            choiceIndices: [0, 1, 2, 3],
          },
        },
      },
      score: { correct: 0, total: 1 },
      loadNext: vi.fn(),
      select: vi.fn(),
      loading: false,
    });
    render(<QuizRunner />);
    expect(screen.getByText("不正解")).toBeInTheDocument();
    expect(screen.queryByText(/解説:/)).not.toBeInTheDocument();
  });
});
