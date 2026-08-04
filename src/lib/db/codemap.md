# src/lib/db/

## Responsibility

Database layer: Drizzle ORM setup, schema definitions, and repository pattern for quiz CRUD operations.

## Modules

- `index.ts` — Drizzle instance creation + Turso client setup
- `schema.ts` — SQLite table definitions (quiz_sets, questions)
- `repository/quiz-repository.ts` — CRUD functions (createQuizSet, getQuizSet, listQuizSets)
