import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionCard } from "@/components/QuestionCard";

describe("QuestionCard", () => {
  const choices = ["Choice A", "Choice B", "Choice C", "Choice D"];

  it("renders question and choices as divs (no interactive elements)", () => {
    render(<QuestionCard question="What is 2+2?" choices={choices} correctIndex={1} />);
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText("Choice A")).toBeInTheDocument();
    expect(screen.getByText("Choice B")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("highlights the correct choice and not the others", () => {
    render(<QuestionCard question="What is 2+2?" choices={choices} correctIndex={1} />);
    const choiceEls = choices.map((c) => screen.getByText(c).parentElement!);
    expect(choiceEls[1].className).toContain("bg-success/20");
    expect(choiceEls[0].className).not.toContain("bg-success/20");
    expect(choiceEls[2].className).not.toContain("bg-success/20");
    expect(choiceEls[3].className).not.toContain("bg-success/20");
  });

  it("renders without highlighting when correctIndex is undefined", () => {
    render(<QuestionCard question="What is 2+2?" choices={choices} />);
    const choiceEls = choices.map((c) => screen.getByText(c).parentElement!);
    choiceEls.forEach((el) => expect(el.className).not.toContain("bg-success/20"));
  });
});
