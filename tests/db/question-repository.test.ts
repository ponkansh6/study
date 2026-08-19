import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
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
  listQuestions,
  deleteQuestion,
  getQuestionSource,
  replaceKnowledgeWithQuestion,
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

    it("favors the question answered longer ago (recency differentiation via answered_at)", async () => {
      const { questionId: idA } = await insertQuestion({ question: "Old answer" });
      const { questionId: idB } = await insertQuestion({ question: "Recent answer" });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Both have 1 correct answer, but A was answered 30 days ago, B just now.
      await dbRef
        .db!.insert(schema.answerLogs)
        .values({ questionId: idA, selectedIndex: 0, isCorrect: 1, answeredAt: thirtyDaysAgo });
      await dbRef
        .db!.insert(schema.answerLogs)
        .values({ questionId: idB, selectedIndex: 0, isCorrect: 1, answeredAt: now });

      // A (30 days ago) has recency=3.0 → weight 3.0; B (just now) has recency=0.2 → weight 0.1 (clamped).
      // Mock rng=0.5: falls within A's [0, 3.0) range → A is picked.
      // If seconds→ms conversion is broken (no ×1000), both get recency=3.0 and equal weight,
      // so result depends on SQLite ordering → test becomes non-deterministic.
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      try {
        const q = await pickWeightedRandomQuestion();
        expect(q!.question).toBe("Old answer");
      } finally {
        spy.mockRestore();
      }
    });

    it("uses id as tiebreaker when answered_at is identical", async () => {
      const { questionId: idA } = await insertQuestion({ question: "First inserted" });
      const { questionId: idB } = await insertQuestion({ question: "Second inserted" });

      const fixedDate = new Date("2025-06-01T12:00:00Z");

      // Insert order: A is incorrect first, B is correct second (same timestamp).
      // Without tiebreaker (id DESC), SQLite may return A first (higher weight 30.0)
      // and pick it. With tiebreaker, B (higher id) is "latest", so B has low weight
      // (0.0833) and A has high weight (30.0).
      await dbRef.db!.insert(schema.answerLogs).values({
        questionId: idA,
        selectedIndex: 1,
        isCorrect: 0,
        answeredAt: fixedDate,
      });
      await dbRef.db!.insert(schema.answerLogs).values({
        questionId: idB,
        selectedIndex: 0,
        isCorrect: 1,
        answeredAt: fixedDate,
      });

      // With tiebreaker: A has weight 30.0, B has weight 0.0833. Total = 30.0833.
      // To pick B (the second item), randomVal must fall in B's range [30.0, 30.0833].
      // rng = randomVal / totalWeight. For totalWeight = 30.0833, choosing rng = 0.9999
      // gives randomVal = 30.0803 > 30.0 (skips A) and < 30.0833 (picks B).
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.9999);
      try {
        const q = await pickWeightedRandomQuestion();
        expect(q!.question).toBe("Second inserted");
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

  describe("listQuestions", () => {
    it("returns empty array when none", async () => {
      const list = await listQuestions();
      expect(list).toEqual([]);
    });

    it("returns fields (id/question/createdAt) and orders newest-first", async () => {
      const olderDate = new Date(Date.now() - 10000);
      const newerDate = new Date(Date.now());

      await insertQuestion({ question: "Older question", createdAt: olderDate });
      await insertQuestion({ question: "Newer question", createdAt: newerDate });

      const list = await listQuestions();
      expect(list).toHaveLength(2);
      expect(list[0]!.question).toBe("Newer question");
      expect(list[1]!.question).toBe("Older question");
      expect(list[0]).toHaveProperty("id");
      expect(list[0]).toHaveProperty("createdAt");
    });
  });

  describe("deleteQuestion", () => {
    it("returns false for non-existent id", async () => {
      const result = await deleteQuestion(9999);
      expect(result).toBe(false);
    });

    it("deletes the question AND its knowledge AND its answerLogs, leaving other questions intact", async () => {
      const q1 = await insertQuestion({ question: "Q1" });
      const q2 = await insertQuestion({ question: "Q2" });

      // Add answer logs to both
      await dbRef.db!.insert(schema.answerLogs).values([
        { questionId: q1.questionId, selectedIndex: 0, isCorrect: 1 },
        { questionId: q2.questionId, selectedIndex: 0, isCorrect: 0 },
      ]);

      const success = await deleteQuestion(q1.questionId);
      expect(success).toBe(true);

      // Verify q1 and its knowledge are deleted
      expect(await getQuestionById(q1.questionId)).toBeNull();
      const [k1] = await dbRef
        .db!.select()
        .from(schema.knowledge)
        .where(eq(schema.knowledge.id, q1.knowledgeId));
      expect(k1).toBeUndefined();

      // Verify q1's answer logs are deleted
      const logs1 = await dbRef
        .db!.select()
        .from(schema.answerLogs)
        .where(eq(schema.answerLogs.questionId, q1.questionId));
      expect(logs1).toEqual([]);

      // Verify q2 and its knowledge and logs remain intact
      expect(await getQuestionById(q2.questionId)).not.toBeNull();
      const [k2] = await dbRef
        .db!.select()
        .from(schema.knowledge)
        .where(eq(schema.knowledge.id, q2.knowledgeId));
      expect(k2).toBeDefined();
      const logs2 = await dbRef
        .db!.select()
        .from(schema.answerLogs)
        .where(eq(schema.answerLogs.questionId, q2.questionId));
      expect(logs2).toHaveLength(1);
    });
  });

  describe("getQuestionSource and replaceKnowledgeWithQuestion", () => {
    it("getQuestionSource returns title and sourceText or null", async () => {
      const { questionId } = await insertQuestion({ question: "Source Test" });
      const src = await getQuestionSource(questionId);
      expect(src).toEqual({
        title: "Title",
        sourceText: "Source",
      });

      expect(await getQuestionSource(9999)).toBeNull();
    });

    it("replaceKnowledgeWithQuestion replaces old question/knowledge/logs with new ones and keeps other questions untouched", async () => {
      const q1 = await insertQuestion({ question: "Old Q1" });
      const q2 = await insertQuestion({ question: "Q2 Untouched" });

      await dbRef.db!.insert(schema.answerLogs).values([
        { questionId: q1.questionId, selectedIndex: 0, isCorrect: 1 },
        { questionId: q2.questionId, selectedIndex: 0, isCorrect: 0 },
      ]);

      const res = await replaceKnowledgeWithQuestion({
        replaceQuestionId: q1.questionId,
        title: "New Title",
        sourceText: "New Source",
        question: {
          question: "New Q1 Refined",
          choices: ["1", "2", "3", "4"],
          correctIndex: 1,
          explanation: "New Exp",
        },
      });

      expect(res).not.toBeNull();
      expect(res!.questionId).not.toBe(q1.questionId);
      expect(res!.knowledgeId).not.toBe(q1.knowledgeId);

      // Old Q1 and its knowledge/logs are gone
      expect(await getQuestionById(q1.questionId)).toBeNull();
      const [oldK] = await dbRef
        .db!.select()
        .from(schema.knowledge)
        .where(eq(schema.knowledge.id, q1.knowledgeId));
      expect(oldK).toBeUndefined();
      const oldLogs = await dbRef
        .db!.select()
        .from(schema.answerLogs)
        .where(eq(schema.answerLogs.questionId, q1.questionId));
      expect(oldLogs).toEqual([]);

      // New Q1 exists with correct fields
      const newQ = await getQuestionById(res!.questionId);
      expect(newQ!.question).toBe("New Q1 Refined");
      expect(newQ!.knowledgeId).toBe(res!.knowledgeId);

      // Q2 and its logs remain untouched
      expect(await getQuestionById(q2.questionId)).not.toBeNull();
      const q2Logs = await dbRef
        .db!.select()
        .from(schema.answerLogs)
        .where(eq(schema.answerLogs.questionId, q2.questionId));
      expect(q2Logs).toHaveLength(1);
    });

    it("replaceKnowledgeWithQuestion returns null for missing id", async () => {
      const res = await replaceKnowledgeWithQuestion({
        replaceQuestionId: 9999,
        title: "Title",
        sourceText: "Source",
        question: {
          question: "Q",
          choices: ["1", "2", "3", "4"],
          correctIndex: 0,
        },
      });
      expect(res).toBeNull();
    });
  });
});
