import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateForm } from "@/app/create/create-form";
import * as client from "@/lib/api/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/api/client", () => ({
  createQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  regenerateQuestion: vi.fn(),
}));

describe("CreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders textarea and initial create button, and does not show regenerate/discard buttons before generation", () => {
    render(<CreateForm />);
    expect(screen.getByPlaceholderText("ナレッジを入力してください...")).toBeDefined();
    expect(screen.getByRole("button", { name: "この内容から1問作る" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "難易度を上げて再作成" })).toBeNull();
    expect(screen.queryByRole("button", { name: "破棄" })).toBeNull();
  });

  it("generates a question successfully and shows regenerate and discard buttons", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Created Question?",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: "Exp",
    });

    render(<CreateForm />);
    const textarea = screen.getByPlaceholderText("ナレッジを入力してください...");
    fireEvent.change(textarea, { target: { value: "Some source knowledge" } });

    const btn = screen.getByRole("button", { name: "この内容から1問作る" });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Created Question?")).toBeDefined();
    });

    expect(screen.getByRole("button", { name: "難易度を上げて再作成" })).toBeDefined();
    expect(screen.getByRole("button", { name: "破棄" })).toBeDefined();
    expect(screen.queryByText(/難易度 Lv/)).toBeNull(); // Lv1 has no badge
  });

  it("regenerates question successfully, increments difficulty and shows Lv badge", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Q1",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    vi.mocked(client.regenerateQuestion).mockResolvedValueOnce({
      id: 2,
      knowledgeId: 11,
      question: "Q2 Refined",
      choices: ["A", "B", "C", "D"],
      correctIndex: 1,
      explanation: "Refined",
    });

    render(<CreateForm />);
    fireEvent.change(screen.getByPlaceholderText("ナレッジを入力してください..."), {
      target: { value: "text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q1")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "難易度を上げて再作成" }));

    await waitFor(() => {
      expect(screen.getByText("Q2 Refined")).toBeDefined();
    });

    expect(screen.getByText("難易度 Lv.2")).toBeDefined();
    expect(client.regenerateQuestion).toHaveBeenCalledWith(1, 2);
  });

  it("keeps old question and shows ErrorMessage when regenerate fails", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Q1 Original",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    vi.mocked(client.regenerateQuestion).mockRejectedValueOnce(new Error("LLM timeout"));

    render(<CreateForm />);
    fireEvent.change(screen.getByPlaceholderText("ナレッジを入力してください..."), {
      target: { value: "text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q1 Original")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "難易度を上げて再作成" }));

    await waitFor(() => {
      expect(screen.getByText("LLM timeout")).toBeDefined();
    });

    // Old question still rendered, no Lv badge
    expect(screen.getByText("Q1 Original")).toBeDefined();
    expect(screen.queryByText(/難易度 Lv/)).toBeNull();
  });

  it("disables button and shows note when difficulty reaches Lv5", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Q1",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    vi.mocked(client.regenerateQuestion)
      .mockResolvedValueOnce({
        id: 2,
        knowledgeId: 11,
        question: "Lv2",
        choices: ["1", "2", "3", "4"],
        correctIndex: 0,
        explanation: null,
      })
      .mockResolvedValueOnce({
        id: 3,
        knowledgeId: 12,
        question: "Lv3",
        choices: ["1", "2", "3", "4"],
        correctIndex: 0,
        explanation: null,
      })
      .mockResolvedValueOnce({
        id: 4,
        knowledgeId: 13,
        question: "Lv4",
        choices: ["1", "2", "3", "4"],
        correctIndex: 0,
        explanation: null,
      })
      .mockResolvedValueOnce({
        id: 5,
        knowledgeId: 14,
        question: "Lv5",
        choices: ["1", "2", "3", "4"],
        correctIndex: 0,
        explanation: null,
      });

    render(<CreateForm />);
    fireEvent.change(screen.getByPlaceholderText("ナレッジを入力してください..."), {
      target: { value: "text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q1")).toBeDefined();
    });

    const regenBtn = screen.getByRole("button", { name: "難易度を上げて再作成" });

    for (let lv = 2; lv <= 5; lv++) {
      fireEvent.click(regenBtn);
      await waitFor(() => {
        expect(screen.getByText(`Lv${lv === 5 ? "5" : lv}`)).toBeDefined();
      });
    }

    expect(screen.getByText("難易度 Lv.5")).toBeDefined();
    expect(regenBtn.getAttribute("disabled")).not.toBeNull();
    expect(screen.getByText("これ以上は難易度を上げられません")).toBeDefined();
  });

  it("discards question successfully, returns to form with textarea text retained", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Q1",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    vi.mocked(client.deleteQuestion).mockResolvedValueOnce(undefined);

    render(<CreateForm />);
    const textarea = screen.getByPlaceholderText("ナレッジを入力してください...");
    fireEvent.change(textarea, { target: { value: "Retained knowledge text" } });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q1")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "破棄" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("ナレッジを入力してください...")).toBeDefined();
    });

    expect(client.deleteQuestion).toHaveBeenCalledWith(1);
    expect((textarea as HTMLTextAreaElement).value).toBe("Retained knowledge text");
  });

  it("shows error and keeps result when discard fails", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Q1",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    vi.mocked(client.deleteQuestion).mockRejectedValueOnce(new Error("Network delete error"));

    render(<CreateForm />);
    fireEvent.change(screen.getByPlaceholderText("ナレッジを入力してください..."), {
      target: { value: "text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q1")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "破棄" }));

    await waitFor(() => {
      expect(screen.getByText("Network delete error")).toBeDefined();
    });

    expect(screen.getByText("Q1")).toBeDefined(); // still in result view
  });

  it("resets difficulty and error when '続けてもう1問作る' is clicked", async () => {
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 1,
      knowledgeId: 10,
      question: "Q1",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    vi.mocked(client.regenerateQuestion).mockResolvedValueOnce({
      id: 2,
      knowledgeId: 11,
      question: "Q2",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });

    render(<CreateForm />);
    fireEvent.change(screen.getByPlaceholderText("ナレッジを入力してください..."), {
      target: { value: "text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q1")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "難易度を上げて再作成" }));
    await waitFor(() => {
      expect(screen.getByText("難易度 Lv.2")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "続けてもう1問作る" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("ナレッジを入力してください...")).toBeDefined();
    });

    // Create another question -> should start at Lv1 (no badge)
    vi.mocked(client.createQuestion).mockResolvedValueOnce({
      id: 3,
      knowledgeId: 12,
      question: "Q3 fresh",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
    });
    fireEvent.change(screen.getByPlaceholderText("ナレッジを入力してください..."), {
      target: { value: "new text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "この内容から1問作る" }));

    await waitFor(() => {
      expect(screen.getByText("Q3 fresh")).toBeDefined();
    });
    // The live region message "難易度 Lv.2 で再作成しました" remains in the live region div unless cleared,
    // but the Lv badge itself (displayed above QuestionCard) should be gone (or query by text / level badge).
    // Let's check specifically for the badge:
    expect(screen.queryByText("難易度 Lv.2")).toBeNull();
  });
});
