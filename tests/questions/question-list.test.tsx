import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionList } from "@/app/questions/question-list";
import { deleteQuestion } from "@/lib/api/client";
import { useRouter } from "next/navigation";

vi.mock("@/lib/api/client", () => ({
  deleteQuestion: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("QuestionList", () => {
  const mockItems = [
    { id: 1, question: "Q1", createdAt: "2026/08/01" },
    { id: 2, question: "Q2", createdAt: "2026/08/02" },
  ];

  it("renders list and count", () => {
    render(<QuestionList initialItems={mockItems} />);
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("2件")).toBeInTheDocument();
  });

  it("renders EmptyState when empty", () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as any);
    render(<QuestionList initialItems={[]} />);
    expect(screen.getByText("問題がありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "問題を作る" }));
    expect(push).toHaveBeenCalledWith("/create");
  });

  it("handles delete flow", async () => {
    vi.mocked(deleteQuestion).mockResolvedValue(undefined);
    render(<QuestionList initialItems={mockItems} />);

    // Trigger delete
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "削除する" }));

    // Confirm delete
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith(1));
    expect(screen.queryByText("Q1")).not.toBeInTheDocument();
  });

  it("handles cancel", () => {
    render(<QuestionList initialItems={mockItems} />);
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByText("本当に削除しますか？")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getAllByRole("button", { name: "削除" })[0]);
  });

  it("handles delete loading state", async () => {
    let resolve: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    vi.mocked(deleteQuestion).mockReturnValue(promise);

    render(<QuestionList initialItems={mockItems} />);
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    const btn = screen.getByRole("button", { name: "削除する" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");

    resolve!();
    await waitFor(() => expect(screen.queryByText("Q1")).not.toBeInTheDocument());
  });

  it("independent row confirm", () => {
    render(<QuestionList initialItems={mockItems} />);
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
    // Row 1's "削除" button should be gone, but Row 2's should still be there.
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("does not focus any delete button on initial mount", () => {
    render(<QuestionList initialItems={mockItems} />);
    const buttons = screen.getAllByRole("button", { name: "削除" });
    for (const btn of buttons) {
      expect(document.activeElement).not.toBe(btn);
    }
  });

  it("keeps question text visible when in confirming state", () => {
    render(<QuestionList initialItems={mockItems} />);
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
  });
});
