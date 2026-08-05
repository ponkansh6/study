import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("renders children and stays enabled by default", () => {
    render(<Button>作成</Button>);
    const button = screen.getByRole("button", { name: "作成" });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("when loading, disables the button and sets aria-busy", () => {
    render(<Button loading>作成</Button>);
    const button = screen.getByRole("button", { name: "作成" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("when loading, renders an inline spinner", () => {
    const { container } = render(<Button loading>作成</Button>);
    expect(container.querySelector('span[aria-hidden="true"].animate-spin')).not.toBeNull();
  });

  it("loading overrides an explicit disabled prop", () => {
    render(
      <Button loading disabled>
        作成
      </Button>,
    );
    expect(screen.getByRole("button", { name: "作成" })).toBeDisabled();
  });
});
