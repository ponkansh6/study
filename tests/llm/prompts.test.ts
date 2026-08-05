import { describe, it, expect } from "vitest";
import { QUIZ_GENERATION_PROMPT } from "@/lib/llm/prompts";

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
