import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No items" description="Please add some items." />);
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Please add some items.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders action button when actionLabel and onAction are provided", () => {
    const handleAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Add item" onAction={handleAction} />);
    const button = screen.getByRole("button", { name: "Add item" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
