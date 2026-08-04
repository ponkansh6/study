# src/lib/

## Responsibility

Core utilities and business logic: LLM integration, database access, shuffling, and constants.

## Modules

- `constants.ts` — LLM/quiz configuration (timeouts, retry counts, model name, etc.)
- `shuffle.ts` — Fisher-Yates shuffling for questions and choices
- `llm/` — Google Gemini integration (client, schemas, parser, prompts, quiz generation)
- `db/` — Drizzle ORM + Turso database (schema, index setup, repository pattern)
