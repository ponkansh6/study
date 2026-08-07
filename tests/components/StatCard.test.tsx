import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/StatCard";

describe("StatCard", () => {
  it("renders label and value without ring", () => {
    render(<StatCard label="問題数" value="12" />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("問題数")).toBeInTheDocument();
  });

  it("renders with progress ring when ring prop is provided", () => {
    render(<StatCard label="本日の正答率" value="75%" ring={0.75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("本日の正答率")).toBeInTheDocument();
  });
});
