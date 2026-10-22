# src/lib/db/

## Responsibility

Database layer: Drizzle ORM setup with lazy connection initialization, SQLite schema definitions, and repository pattern split into question management and answer logging/stats.

## Modules

- `index.ts` — Drizzle instance creation + Turso client lazy initialization proxy
- `schema.ts` — SQLite table definitions (`knowledge`, `questions`, `answerLogs`)
- `repository/`
  - `question-repository.ts` — Question creation, weighted random question picker (苦手優先, 4-axis: accuracy, miss bonus, mastery decay, recency), `listQuestions()`, `deleteQuestion()`, `getQuestionSource()` (join to `knowledge` for regeneration source), and `replaceKnowledgeWithQuestion()` (atomic insert-new + delete-old in one transaction) — all deletes use an explicit child→parent order
  - `weighting.ts` — Pure logic module: `computeWeight(stats, now)` (4-axis multiplicative weighting) and `pickByWeight(items, rng)`
  - `answer-repository.ts` — Answer recording (`answerLogs`) and today's JST aggregate stats (`getStats()`)
