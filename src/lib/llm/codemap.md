# src/lib/llm/

## Responsibility

Google Gemini API integration for generating single 4-choice questions from knowledge text with structured Zod output validation and retry resilience.

## Modules

- `client.ts` — `callGemini()` wrapper, exponential backoff retry logic, and rate-limit handling
- `schemas.ts` — Zod schemas for single question structure validation
- `parser.ts` — `parseWithRetry()` with JSON parsing + schema validation + retry loop
- `prompts.ts` — LLM prompt templates (`QUIZ_GENERATION_PROMPT`)
- `quiz.ts` — High-level `generateQuestion(sourceText)` orchestration
