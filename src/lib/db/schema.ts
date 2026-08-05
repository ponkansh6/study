import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm/sql";

export const knowledge = sqliteTable("knowledge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  sourceText: text("source_text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const questions = sqliteTable(
  "questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    knowledgeId: integer("knowledge_id")
      .notNull()
      .unique()
      .references(() => knowledge.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    choices: text("choices", { mode: "json" }).notNull().$type<string[]>(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"), // nullable: optional in API
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    knowledgeIdIdx: index("questions_knowledge_id_idx").on(t.knowledgeId),
  }),
);

export const answerLogs = sqliteTable(
  "answer_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    selectedIndex: integer("selected_index").notNull(),
    isCorrect: integer("is_correct", { mode: "number" }).notNull().$type<0 | 1>(),
    answeredAt: integer("answered_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    questionIdIdx: index("answer_logs_question_id_idx").on(t.questionId),
    answeredAtIdx: index("answer_logs_answered_at_idx").on(t.answeredAt),
  }),
);
