# src/lib/

## Responsibility

Core utilities, database repositories, API clients, LLM integration, and helper functions.

## Modules

- `sleep.ts` — Asynchronous sleep helper
- `choice-label.ts` — Choice label formatter (A/B/C/D)
- `date.ts` — JST date boundary helper (`jstDayStart`)
- `api/` — API helpers (`client.ts`, `response.ts`, `schemas.ts`)
- `llm/` — Google Gemini integration (client, schemas, parser, prompts, generation)
- `db/` — Drizzle ORM + Turso database (schema, lazy connection init, `question-repository.ts`, `answer-repository.ts`)
