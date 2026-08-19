import { describe, it, expect } from "vitest";
import { QUIZ_GENERATION_PROMPT, buildQuizPrompt } from "@/lib/llm/prompts";

describe("QUIZ_GENERATION_PROMPT", () => {
  it("contains an explicit Japanese-generation rule at the top of the Rules list", () => {
    expect(QUIZ_GENERATION_PROMPT).toMatch(
      /ALL generated content \(question, choices, explanation\) MUST be written in Japanese/,
    );
    expect(QUIZ_GENERATION_PROMPT).toMatch(/日本語/);
  });

  it("requires all JSON text values to be in Japanese in the output-structure line", () => {
    expect(QUIZ_GENERATION_PROMPT).toContain("with all text values in Japanese");
  });
});

describe("buildQuizPrompt", () => {
  it("buildQuizPrompt(text, 1) matches QUIZ_GENERATION_PROMPT with text replaced", () => {
    const text = "Sample source text for testing.";
    const built = buildQuizPrompt(text, 1);
    const expected = QUIZ_GENERATION_PROMPT.replace("{{DIFFICULTY}}", "").replace(
      "{{SOURCE_TEXT}}",
      text,
    );
    expect(built).toBe(expected);
  });

  it("injects difficulty directives for Lv2-5", () => {
    const text = "Sample text";
    const p2 = buildQuizPrompt(text, 2);
    expect(p2).toContain("適用・比較を問う");

    const p5 = buildQuizPrompt(text, 5);
    expect(p5).toContain("複数ステップの高度な推論");
  });

  it("falls back to Lv1 for out of range difficulty (0, 6, NaN)", () => {
    const text = "Sample text";
    expect(buildQuizPrompt(text, 0)).toBe(buildQuizPrompt(text, 1));
    expect(buildQuizPrompt(text, 6)).toBe(buildQuizPrompt(text, 1));
    expect(buildQuizPrompt(text, NaN)).toBe(buildQuizPrompt(text, 1));
  });

  it("includes the common constraint at all levels", () => {
    const text = "Sample text";
    for (const lv of [1, 2, 3, 4, 5]) {
      expect(buildQuizPrompt(text, lv)).toContain(
        "uniquely determinable from the provided text alone",
      );
    }
  });

  it("does not inject directive when source text contains {{DIFFICULTY}} (replacement order safety)", () => {
    const text = "Check {{DIFFICULTY}} injection safety";
    const built = buildQuizPrompt(text, 2);
    // The literal text {{DIFFICULTY}} in sourceText should remain untouched because {{DIFFICULTY}} placeholder was replaced first.
    expect(built).toContain("Check {{DIFFICULTY}} injection safety");
  });
});
