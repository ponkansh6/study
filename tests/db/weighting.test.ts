import { describe, it, expect } from "vitest";
import { computeWeight, pickByWeight } from "@/lib/db/repository/weighting";

describe("computeWeight", () => {
  it("returns 5 when stats is null or undefined", () => {
    expect(computeWeight(null)).toBe(5);
    expect(computeWeight(undefined)).toBe(5);
  });

  it("returns 5 when answered is 0", () => {
    expect(computeWeight({ answered: 0, incorrect: 0, latestIncorrect: false })).toBe(5);
    expect(computeWeight({ answered: 0, incorrect: 0, latestIncorrect: true })).toBe(5);
  });

  it("returns 1 when answered > 0 and incorrect is 0", () => {
    expect(computeWeight({ answered: 4, incorrect: 0, latestIncorrect: false })).toBe(1);
  });

  it("returns 5 when all answered are incorrect", () => {
    expect(computeWeight({ answered: 4, incorrect: 4, latestIncorrect: false })).toBe(5);
  });

  it("returns 3 when half of answered are incorrect", () => {
    expect(computeWeight({ answered: 4, incorrect: 2, latestIncorrect: false })).toBe(3);
  });

  it("applies +2 bonus when latestIncorrect is true", () => {
    expect(computeWeight({ answered: 4, incorrect: 0, latestIncorrect: true })).toBe(3);
    expect(computeWeight({ answered: 4, incorrect: 4, latestIncorrect: true })).toBe(7);
  });
});

describe("pickByWeight", () => {
  it("returns null for empty items list", () => {
    expect(pickByWeight([])).toBeNull();
  });

  it("returns null when total weight is <= 0", () => {
    expect(
      pickByWeight([
        { item: "a", weight: 0 },
        { item: "b", weight: 0 },
      ]),
    ).toBeNull();
  });

  it("always picks the single item", () => {
    expect(pickByWeight([{ item: "only", weight: 10 }], () => 0.5)).toBe("only");
  });

  it("picks item based on rng value", () => {
    const items = [
      { item: "first", weight: 2 },
      { item: "second", weight: 3 },
      { item: "third", weight: 5 },
    ];
    // total weight = 10
    // rng = 0 -> randomVal = 0 -> "first"
    expect(pickByWeight(items, () => 0)).toBe("first");
    // rng = 0.25 -> randomVal = 2.5 -> "second"
    expect(pickByWeight(items, () => 0.25)).toBe("second");
    // rng = 0.9 -> randomVal = 9 -> "third"
    expect(pickByWeight(items, () => 0.9)).toBe("third");
  });
});
