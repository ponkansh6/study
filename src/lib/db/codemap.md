# src/lib/db/

## Responsibility

Database layer: Drizzle ORM setup with lazy connection initialization, SQLite schema definitions, and repository pattern split into question management and answer logging/stats.

## Modules

- `index.ts` — Drizzle instance creation + Turso client lazy initialization proxy
- `schema.ts` — SQLite table definitions (`knowledge`, `questions`, `answerLogs`)
- `repository/`
  - `question-repository.ts` — Question creation and weighted random question picker (苦手優先)
  - `answer-repository.ts` — Answer recording (`answerLogs`) and aggregate stats (`getStats()`)
