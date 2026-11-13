import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultBanner from "@/components/ResultBanner";

describe("ResultBanner", () => {
  it("renders correct state when isCorrect is true", () => {
    render(<ResultBanner isCorrect={true} />);
    expect(screen.getByText("正解！")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders incorrect state when isCorrect is false", () => {
    render(<ResultBanner isCorrect={false} />);
    expect(screen.getByText("不正解")).toBeInTheDocument();
    expect(screen.getByText("✗")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
