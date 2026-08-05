import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavLink } from "@/components/NavLink";

describe("NavLink", () => {
  it("renders children and passes href and className to the link", () => {
    render(
      <NavLink href="/dashboard" className="nav-class" pendingClassName="pending-class">
        Home
      </NavLink>,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveClass("nav-class");
  });
});
