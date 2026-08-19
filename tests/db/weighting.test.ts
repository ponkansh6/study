import { describe, it, expect } from "vitest";
import {
  computeWeight,
  pickByWeight,
  UNSEEN_WEIGHT,
  WEIGHT_MIN,
  WEIGHT_MAX,
} from "@/lib/db/repository/weighting";
import type { WeightStats } from "@/lib/db/repository/weighting";

const NOW = new Date("2026-08-18T00:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

function stats(overrides: Partial<WeightStats> & { answered: number }): WeightStats {
  return {
    incorrect: 0,
    latestIncorrect: false,
    lastAnsweredAt: null,
    ...overrides,
  };
}

describe("computeWeight", () => {
  describe("unseen questions", () => {
    it("returns UNSEEN_WEIGHT for null", () => {
      expect(computeWeight(null, NOW)).toBe(UNSEEN_WEIGHT);
    });

    it("returns UNSEEN_WEIGHT for undefined", () => {
      expect(computeWeight(undefined, NOW)).toBe(UNSEEN_WEIGHT);
    });

    it("returns UNSEEN_WEIGHT when answered is 0", () => {
      expect(computeWeight(stats({ answered: 0 }), NOW)).toBe(UNSEEN_WEIGHT);
    });
  });

  describe("recency monotonicity", () => {
    it("increases with elapsed days and caps at RECENCY_FULL_DAYS", () => {
      const base = stats({
        answered: 4,
        incorrect: 0,
        latestIncorrect: false,
      });
      const w0 = computeWeight({ ...base, lastAnsweredAt: daysAgo(0) }, NOW);
      const w1 = computeWeight({ ...base, lastAnsweredAt: daysAgo(1) }, NOW);
      const w3 = computeWeight({ ...base, lastAnsweredAt: daysAgo(3.5) }, NOW);
      const w7 = computeWeight({ ...base, lastAnsweredAt: daysAgo(7) }, NOW);
      const w30 = computeWeight({ ...base, lastAnsweredAt: daysAgo(30) }, NOW);

      expect(w0).toBeLessThan(w1);
      expect(w1).toBeLessThan(w3);
      expect(w3).toBeLessThan(w7);
      // 7 days == 30 days (capped)
      expect(w7).toBeCloseTo(w30, 10);
    });
  });

  describe("mastery decay", () => {
    it("decreases with correct count and caps at MASTERY_CAP", () => {
      const base = {
        incorrect: 0,
        latestIncorrect: false,
        lastAnsweredAt: daysAgo(7),
      };
      const w1 = computeWeight(stats({ ...base, answered: 1 }), NOW);
      const w3 = computeWeight(stats({ ...base, answered: 3 }), NOW);
      const w5 = computeWeight(stats({ ...base, answered: 5 }), NOW);
      const w20 = computeWeight(stats({ ...base, answered: 20 }), NOW);

      expect(w1).toBeGreaterThan(w3);
      expect(w3).toBeGreaterThan(w5);
      // 5 == 20 (MASTERY_CAP)
      expect(w5).toBeCloseTo(w20, 10);
    });
  });

  describe("miss bonus", () => {
    it("increases with incorrect count at same ratio, capped at MISS_CAP", () => {
      const base = {
        latestIncorrect: false,
        lastAnsweredAt: daysAgo(7),
      };
      // Same 50% ratio: 2/4, 4/8, 8/16
      const w24 = computeWeight(stats({ ...base, answered: 4, incorrect: 2 }), NOW);
      const w48 = computeWeight(stats({ ...base, answered: 8, incorrect: 4 }), NOW);
      const w816 = computeWeight(stats({ ...base, answered: 16, incorrect: 8 }), NOW);

      expect(w24).toBeLessThan(w48);
      // At 50% ratio, mastery decay at 8 correct dominates over miss bonus at 4 → w816 < w48
      expect(w816).toBeLessThan(w48);
    });
  });

  describe("latestIncorrect floor", () => {
    it("prevents recency from pushing weight below 1.0 for recently-incorrect answers", () => {
      const base = {
        answered: 4,
        incorrect: 0,
        lastAnsweredAt: daysAgo(0),
      };
      // Absolute assertion: floor removes recency suppression (1.0 instead of 0.2)
      // and LATEST_MISS_MULT=2 is applied → 1.0*1.0*0.4167*1.0*2 = 0.8333
      // Without floor: 1.0*1.0*0.4167*0.2*2 = 0.1667 → caught by WEIGHT_MIN
      const wIncorrect = computeWeight(stats({ ...base, latestIncorrect: true }), NOW);
      expect(wIncorrect).toBeCloseTo(0.8333, 3);
    });
  });

  describe("clamping", () => {
    it("clamps known-mastery case to WEIGHT_MIN", () => {
      // 10 correct, 0 incorrect, just answered, last correct
      const w = computeWeight(
        stats({
          answered: 10,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: daysAgo(0),
        }),
        NOW,
      );
      expect(w).toBeCloseTo(WEIGHT_MIN, 10);
    });

    it("clamps worst case to WEIGHT_MAX", () => {
      // 10 incorrect, latest incorrect, 7+ days ago
      const w = computeWeight(
        stats({
          answered: 10,
          incorrect: 10,
          latestIncorrect: true,
          lastAnsweredAt: daysAgo(7),
        }),
        NOW,
      );
      expect(w).toBeCloseTo(WEIGHT_MAX, 10);
    });
  });

  describe("lastAnsweredAt null with answered > 0", () => {
    it("treats as RECENCY_FULL_DAYS (maximum recency)", () => {
      const wNull = computeWeight(
        stats({
          answered: 4,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: null,
        }),
        NOW,
      );
      const w7 = computeWeight(
        stats({
          answered: 4,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: daysAgo(7),
        }),
        NOW,
      );
      expect(wNull).toBeCloseTo(w7, 10);
    });
  });

  describe("future timestamp (clock skew)", () => {
    it("clamps elapsedDays to 0 for future lastAnsweredAt", () => {
      const future = new Date(NOW.getTime() + 86400000); // +1 day
      const wFuture = computeWeight(
        stats({
          answered: 4,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: future,
        }),
        NOW,
      );
      const wNow = computeWeight(
        stats({
          answered: 4,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: NOW,
        }),
        NOW,
      );
      expect(wFuture).toBeCloseTo(wNow, 10);
    });
  });

  describe("representative values", () => {
    it("matches expected weight distribution from plan", () => {
      // 10 correct, just answered, 0 days → ~0.10
      const wPerfect = computeWeight(
        stats({
          answered: 10,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: daysAgo(0),
        }),
        NOW,
      );
      expect(wPerfect).toBeCloseTo(0.1, 1);

      // 10 correct, just answered, 7 days → ~1.09
      const wStale = computeWeight(
        stats({
          answered: 10,
          incorrect: 0,
          latestIncorrect: false,
          lastAnsweredAt: daysAgo(7),
        }),
        NOW,
      );
      expect(wStale).toBeCloseTo(1.09, 1);

      // 10 incorrect, latest incorrect, 7 days → 30.0 (capped)
      const wWorst = computeWeight(
        stats({
          answered: 10,
          incorrect: 10,
          latestIncorrect: true,
          lastAnsweredAt: daysAgo(7),
        }),
        NOW,
      );
      expect(wWorst).toBeCloseTo(30.0, 1);
    });
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
