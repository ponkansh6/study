import { describe, it, expect } from "vitest";
import { QuizQuestionSchema, QuizGenerationSchema } from "@/lib/llm/schemas";

describe("QuizQuestionSchema", () => {
  it("validates a correct question", () => {
    const valid = {
      question: "What is the capital of France?",
      choices: ["London", "Berlin", "Paris", "Madrid"],
      correctIndex: 2,
      explanation: "Paris is the capital of France.",
    };
    const result = QuizQuestionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects if choices length is not 4", () => {
    const invalid = {
      question: "What is the capital of France?",
      choices: ["London", "Paris", "Madrid"],
      correctIndex: 1,
    };
    const result = QuizQuestionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects if correctIndex is out of range", () => {
    const invalid = {
      question: "What is the capital of France?",
      choices: ["London", "Berlin", "Paris", "Madrid"],
      correctIndex: 4,
    };
    const result = QuizQuestionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("QuizGenerationSchema", () => {
  it("rejects an array that does not contain exactly 10 questions", () => {
    const invalidArray = Array.from({ length: 5 }, (_, i) => ({
      question: `Question ${i + 1}`,
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
    }));
    const result = QuizGenerationSchema.safeParse(invalidArray);
    expect(result.success).toBe(false);
  });
});
