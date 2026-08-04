import { index, integer, sql, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const quizSets = sqliteTable("quiz_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  sourceText: text("source_text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const questions = sqliteTable(
  "questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    quizSetId: integer("quiz_set_id")
      .notNull()
      .references(() => quizSets.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    question: text("question").notNull(),
    choices: text("choices", { mode: "json" }).notNull().$type<string[]>(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
  },
  (t) => ({
    quizSetIdx: index("questions_quiz_set_idx").on(t.quizSetId),
  }),
);
