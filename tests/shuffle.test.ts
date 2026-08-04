import { describe, it, expect } from "vitest";
import { fisherYatesShuffle, shuffleQuestionsAndChoices } from "@/lib/shuffle";
import { Question } from "@/types/quiz";

describe("fisherYatesShuffle", () => {
  it("shuffles array elements while preserving the set of elements", () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = fisherYatesShuffle(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual([...original].sort());
  });
});

describe("shuffleQuestionsAndChoices", () => {
  it("shuffles questions and choices, keeping correct answer trackable", () => {
    const questions: Question[] = [
      {
        id: 1,
        question: "What is 2 + 2?",
        choices: ["3", "4", "5", "6"],
        correctIndex: 1, // "4" is at index 1
        explanation: "2 + 2 is 4",
      },
    ];

    const shuffled = shuffleQuestionsAndChoices(questions);

    expect(shuffled).toHaveLength(1);
    const sq = shuffled[0];
    expect(sq.choices).toHaveLength(4);
    expect([...sq.choices].sort()).toEqual(["3", "4", "5", "6"].sort());

    const selectedChoiceText = sq.choices[sq.correctChoiceIndex];
    expect(selectedChoiceText).toBe("4");
  });
});
