# src/lib/llm/

## Responsibility

Google Gemini API integration for quiz generation with structured output validation.

## Modules

- `client.ts` — `callGemini()` wrapper, exponential backoff retry logic, rate-limit handling
- `schemas.ts` — Zod schemas for quiz question structure and batch validation
- `parser.ts` — `parseWithRetry()` with JSON parsing + schema validation + retry loop
- `prompts.ts` — LLM prompt templates (QUIZ_GENERATION_PROMPT)
- `quiz.ts` — High-level `generateQuizQuestions(sourceText)` orchestration
