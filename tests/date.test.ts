import { describe, it, expect } from "vitest";
import { jstDayStart, formatJstDate } from "../src/lib/date";

describe("jstDayStart", () => {
  it("should return correct JST day start for 2026-08-05T14:59:59Z (JST 23:59:59 -> same day 00:00 JST)", () => {
    const input = new Date("2026-08-05T14:59:59Z"); // 2026-08-05 23:59:59 JST
    const expected = new Date("2026-08-04T15:00:00Z"); // 2026-08-05 00:00:00 JST
    expect(jstDayStart(input).toISOString()).toBe(expected.toISOString());
  });

  it("should return correct JST day start for 2026-08-05T15:00:00Z (JST 00:00:00 next day -> next day 00:00 JST)", () => {
    const input = new Date("2026-08-05T15:00:00Z"); // 2026-08-06 00:00:00 JST
    const expected = new Date("2026-08-05T15:00:00Z"); // 2026-08-06 00:00:00 JST
    expect(jstDayStart(input).toISOString()).toBe(expected.toISOString());
  });

  it("should handle JST 00:00 exactly", () => {
    const input = new Date("2026-01-01T15:00:00Z"); // 2026-01-02 00:00:00 JST
    const expected = new Date("2026-01-01T15:00:00Z");
    expect(jstDayStart(input).toISOString()).toBe(expected.toISOString());
  });

  it("should handle year/month boundary cases (before JST 00:00)", () => {
    const input = new Date("2026-01-01T14:59:59Z"); // 2026-01-01 23:59:59 JST
    const expected = new Date("2025-12-31T15:00:00Z"); // 2026-01-01 00:00:00 JST
    expect(jstDayStart(input).toISOString()).toBe(expected.toISOString());
  });

  it("should handle year/month boundary cases (at JST 00:00)", () => {
    const input = new Date("2025-12-31T15:00:00Z"); // 2026-01-01 00:00:00 JST
    const expected = new Date("2025-12-31T15:00:00Z");
    expect(jstDayStart(input).toISOString()).toBe(expected.toISOString());
  });

  it("should handle leap-day cases correctly", () => {
    const input = new Date("2028-02-29T15:00:00Z"); // 2028-03-01 00:00:00 JST
    const expected = new Date("2028-02-29T15:00:00Z");
    expect(jstDayStart(input).toISOString()).toBe(expected.toISOString());
  });
});

describe("formatJstDate", () => {
  it("should format JST day-crossing correctly at 14:59:59Z (still previous JST day)", () => {
    const input = new Date("2026-08-05T14:59:59Z"); // 2026-08-05 23:59:59 JST
    expect(formatJstDate(input)).toBe("2026/08/05");
  });

  it("should format JST day-crossing correctly at 15:00:00Z (next JST day)", () => {
    const input = new Date("2026-08-05T15:00:00Z"); // 2026-08-06 00:00:00 JST
    expect(formatJstDate(input)).toBe("2026/08/06");
  });

  it("should handle year-crossing correctly", () => {
    const inputBefore = new Date("2025-12-31T14:59:59Z"); // 2025-12-31 23:59:59 JST
    const inputAfter = new Date("2025-12-31T15:00:00Z"); // 2026-01-01 00:00:00 JST
    expect(formatJstDate(inputBefore)).toBe("2025/12/31");
    expect(formatJstDate(inputAfter)).toBe("2026/01/01");
  });

  it("should apply zero-padding correctly for single digit months/days", () => {
    const input = new Date("2026-01-05T03:00:00Z"); // 2026-01-05 12:00:00 JST
    expect(formatJstDate(input)).toBe("2026/01/05");
  });
});
