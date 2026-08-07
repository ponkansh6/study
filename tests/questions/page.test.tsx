import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import QuestionsPage from "@/app/questions/page";
import { listQuestions } from "@/lib/db/repository/question-repository";

vi.mock("@/lib/db/repository/question-repository", () => ({
  listQuestions: vi.fn(),
}));

vi.mock("@/lib/date", () => ({
  formatJstDate: (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "/"),
}));

// Mock the components that use useRouter
vi.mock("@/app/questions/question-list", () => ({
  QuestionList: () => <div>MockedList</div>,
}));

describe("QuestionsPage", () => {
  it("renders formatted list", async () => {
    const mockDate = new Date("2026-08-07T12:00:00Z");
    vi.mocked(listQuestions).mockResolvedValue([{ id: 1, question: "Q1", createdAt: mockDate }]);

    const page = await QuestionsPage();
    const { getByText } = render(page);

    expect(getByText("問題一覧")).toBeInTheDocument();
    expect(getByText("MockedList")).toBeInTheDocument();
  });
});
