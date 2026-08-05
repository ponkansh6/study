import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionCard } from "@/components/QuestionCard";

describe("QuestionCard", () => {
  const choices = ["Choice A", "Choice B", "Choice C", "Choice D"];

  it("renders question and choices as divs when onSelect is not provided", () => {
    render(
      <QuestionCard question="What is 2+2?" choices={choices} correctIndex={1} selectedIndex={1} />,
    );
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText("Choice A")).toBeInTheDocument();
    expect(screen.getByText("Choice B")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders choices as interactive buttons when onSelect is provided", () => {
    const handleSelect = vi.fn();
    render(<QuestionCard question="What is 2+2?" choices={choices} onSelect={handleSelect} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);

    fireEvent.click(buttons[2]);
    expect(handleSelect).toHaveBeenCalledWith(2);
  });

  it("disables buttons when disabled or selectedIndex is present", () => {
    render(
      <QuestionCard
        question="What is 2+2?"
        choices={choices}
        selectedIndex={0}
        onSelect={() => {}}
      />,
    );
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
