import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatePage from "@/app/create/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("CreatePage", () => {
  it("renders CreateForm", () => {
    render(<CreatePage />);
    expect(screen.getByText("問題を作成")).toBeDefined();
    expect(screen.getByPlaceholderText("ナレッジを入力してください...")).toBeDefined();
  });
});
