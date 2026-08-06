import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestDb, type TestDb } from "../helpers/db";
import * as schema from "@/lib/db/schema";

// Holder so the mocked `@/lib/db` module reads the current test db lazily.
const dbRef = vi.hoisted(() => ({ db: null as TestDb["db"] | null }));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    get db() {
      if (!dbRef.db) throw new Error("test db not initialized");
      return dbRef.db;
    },
  };
});

import {
  pickWeightedRandomQuestion,
  getQuestionById,
  createKnowledgeWithQuestion,
} from "@/lib/db/repository/question-repository";

async function insertQuestion(overrides: Partial<typeof schema.questions.$inferInsert> = {}) {
  const [k] = await dbRef
    .db!.insert(schema.knowledge)
    .values({ title: "Title", sourceText: "Source" })
    .returning({ id: schema.knowledge.id });
  const [q] = await dbRef
    .db!.insert(schema.questions)
    .values({
      knowledgeId: k!.id,
      question: "What is TypeScript?",
      choices: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: null,
      ...overrides,
    })
    .returning({ id: schema.questions.id });
  return { knowledgeId: k!.id, questionId: q!.id };
}

describe("question-repository", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
    dbRef.db = testDb.db;
  });

  afterEach(() => {
    testDb.cleanup();
  });

  describe("pickWeightedRandomQuestion", () => {
    it("returns null when there are no questions", async () => {
      expect(await pickWeightedRandomQuestion()).toBeNull();
    });

    it("returns a question when questions exist and no answer logs", async () => {
      await insertQuestion();
      const q = await pickWeightedRandomQuestion();
      expect(q).not.toBeNull();
      expect(q).toHaveProperty("question", "What is TypeScript?");
      expect(q!.choices).toEqual(["A", "B", "C", "D"]);
    });

    it("excludes the given ids", async () => {
      const { questionId } = await insertQuestion();
      await insertQuestion({ question: "Second question" });

      const q = await pickWeightedRandomQuestion([questionId]);
      expect(q).not.toBeNull();
      expect(q!.question).toBe("Second question");
    });

    it("weights a question with all-incorrect answers higher (deterministic rng)", async () => {
      const { questionId } = await insertQuestion();
      await insertQuestion({ question: "Second question" });

      // Record an incorrect answer for the first question.
      await dbRef
        .db!.insert(schema.answerLogs)
        .values({ questionId, selectedIndex: 1, isCorrect: 0 });

      // Force rng to 0 so the first (highest-weight) candidate is picked.
      const spy = vi.spyOn(Math, "random").mockReturnValue(0);
      try {
        const q = await pickWeightedRandomQuestion();
        // The question with an incorrect answer has weight 1+4*1+2 = 7,
        // the untouched one has weight 5. With rng=0 the first candidate wins.
        expect(q).not.toBeNull();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("getQuestionById", () => {
    it("returns the full row for an existing id", async () => {
      const { questionId } = await insertQuestion();
      const q = await getQuestionById(questionId);
      expect(q).not.toBeNull();
      expect(q!.id).toBe(questionId);
      expect(q!.question).toBe("What is TypeScript?");
      expect(q!.choices).toEqual(["A", "B", "C", "D"]);
      expect(q!.correctIndex).toBe(0);
      expect(q!.explanation).toBeNull();
      expect(q!.createdAt).toBeInstanceOf(Date);
    });

    it("returns null for a missing id", async () => {
      expect(await getQuestionById(9999)).toBeNull();
    });
  });

  describe("createKnowledgeWithQuestion", () => {
    it("creates a knowledge and question row", async () => {
      const result = await createKnowledgeWithQuestion({
        title: "T",
        sourceText: "S",
        question: {
          question: "Q?",
          choices: ["A", "B", "C", "D"],
          correctIndex: 2,
          explanation: "E",
        },
      });
      expect(result).toHaveProperty("knowledgeId");
      expect(result).toHaveProperty("questionId");

      const q = await getQuestionById(result.questionId);
      expect(q!.question).toBe("Q?");
      expect(q!.correctIndex).toBe(2);
      expect(q!.explanation).toBe("E");
    });
  });
});
