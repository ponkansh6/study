# src/lib/llm/

## Responsibility

Google Gemini API integration for generating single 4-choice questions from knowledge text with structured Zod output validation and retry resilience.

## Modules

- `client.ts` — `callGemini()` wrapper, exponential backoff retry logic, and rate-limit handling
- `schemas.ts` — Zod schemas for single question structure validation
- `parser.ts` — `parseWithRetry()` with JSON parsing + schema validation + retry loop
- `prompts.ts` — LLM prompt templates (`QUIZ_GENERATION_PROMPT`), difficulty directives (`DIFFICULTY_DIRECTIVES`, Lv1-5), and `buildQuizPrompt(sourceText, difficulty)` (replaces `{{DIFFICULTY}}` before `{{SOURCE_TEXT}}` to prevent injection from user input)
- `quiz.ts` — High-level `generateQuestion(sourceText, difficulty = 1)` orchestration (uses `LLM_QUIZ_MAX_TOKENS_HARD` = 1024 when difficulty >= 2)
