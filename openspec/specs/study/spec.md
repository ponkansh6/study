# Study - 1-Knowledge-1-Question Endless Learning Specification

## Overview

Study is a Next.js application that transforms knowledge text into interactive 4-choice questions using the Google Gemini API. The app follows an endless learning model (1 knowledge item = 1 generated question) featuring a weighted random question selection algorithm (苦手優先) and continuous answer logging to track overall statistics.

## Data Model

```typescript
// Database tables (Drizzle ORM / Turso) — shapes defined in src/lib/db/schema.ts.
// These are server-side table rows, not client-facing types (client types live
// in src/types/quiz.ts: Question, QuizQuestion, AnswerResult).
interface Knowledge {
  id: number;
  title: string;
  sourceText: string;
  createdAt: Date;
}

interface Question {
  id: number;
  knowledgeId: number; // 1:1 with knowledge
  question: string;
  choices: string[]; // JSON string[]
  correctIndex: number;
  explanation?: string;
  createdAt: Date;
}

interface AnswerLog {
  id: number;
  questionId: number;
  selectedIndex: number;
  isCorrect: number; // 0 | 1
  answeredAt: Date;
}
```

## Requirements

### R1: Knowledge & Question Generation

**WHEN** user submits knowledge text via form on `/create`
**THEN** `POST /api/questions` triggers Gemini to generate 1 knowledge record and exactly 1 question with 4 choices.

- Title auto-generated from the first 100 characters of input
- JSON validated via Zod schema
- On parse failure or API error, retry with exponential backoff (max 3 retries)

### R2: Endless Learning Question Retrieval

**WHEN** user requests a question on `/answer`
**THEN** `GET /api/questions/random` returns a weighted random question favoring incorrectly answered or unanswered questions (苦手優先).

- Excludes the last 10 answered question IDs passed via query parameters (`exclude=1,2,3`)
- Returns choices without `correctIndex` or `explanation`
- Returns 404 if no questions are available in the database

### R3: Answer Submission & Feedback

**WHEN** user selects a choice and clicks submit on `/answer`
**THEN** `POST /api/answers` validates the answer, records an `answerLogs` entry, and returns feedback (`isCorrect`, `correctIndex`, `explanation`). The UI displays a clear 正解! / 不正解 banner, marks the user's selected wrong answer, and highlights the correct answer. When a choice is selected, the UI immediately shows a sending state (spinner on the selected choice, other choices disabled) while awaiting server response. Double-submission is structurally prevented.

### R4: Client-Side Choice Shuffle

**WHEN** a question is loaded in the answer view
**THEN** client-side Fisher-Yates shuffle randomizes the choice order and tracks the correct index mapping (`shuffleChoices`).

### R5: Dashboard & Stats

**WHEN** user visits `/` (Home)
**THEN** server component displays today's learning stats (`totalQuestions`, `todayAnswers`, `todayAccuracy`) via direct call to `getStats()` from `answer-repository` (aggregating answer logs from JST day start 00:00 onward via `src/lib/date.ts`), with navigation links to `/create` and `/answer`.

### R6: Responsive & Accessible Interface

**WHEN** user interacts with any page
**THEN** UI provides mobile-first responsive design (Tailwind v4), touch-friendly buttons (`min-h-12`), and WCAG 2.1 AA compliance (focus rings, contrast). All buttons and primary navigation links provide immediate tap feedback: a press animation (`motion-safe:active:scale-[0.98]`) on the shared `Button`, inline loading spinners (`loading` prop with `aria-busy` + `disabled`) for asynchronous actions (question generation, next-question, retry, and `router.push` navigation via `useTransition`), pending-navigation feedback on links via `useLinkStatus`, and double-fire guards on `loadNext` / `handleCreate`.

## API Specification

### 1. `POST /api/questions`

- **Request:** `{ sourceText: string }`
- **Response (201):** `{ id, knowledgeId, question, choices, correctIndex, explanation }`
- **Response (400/500):** `{ error: string }`

### 2. `GET /api/questions/random`

- **Query Param:** `exclude` (comma-separated question IDs, e.g., `?exclude=1,2,3`)
- **Response (200):** `{ id, question, choices }` (No correctIndex or explanation)
- **Response (404):** `{ error: "No questions available" }`

### 3. `POST /api/answers`

- **Request:** `{ questionId: number, selectedIndex: number }`
- **Response (200):** `{ isCorrect: boolean, correctIndex: number, explanation: string }`
- **Response (400/404):** `{ error: string }`

## Components

### 1. `/` (Home - `src/app/page.tsx`)

- Server component displaying learning statistics (問題数 / 本日の解答数 / 本日の正答率) directly fetched via `getStats()` (using JST day start helper `src/lib/date.ts`)
- Navigation links to `/create` and `/answer`
- Shared header via `src/app/layout.tsx`

### 2. `/create` (Create - `src/app/create/page.tsx`, `src/app/create/create-form.tsx`)

- Server component shell (`page.tsx`) rendering a `"use client"` form component (`create-form.tsx`) with textarea input for knowledge text
- Submits text via API client, generates 1 question, displays result with correct answer highlighted and links to continue

### 3. `/answer` (Answer - `src/app/answer/page.tsx`, `use-quiz-session.ts`, `quiz-runner.tsx`, `src/app/answer/choice-state.ts`)

- Thin page wrapper rendering `QuizRunner`
- `use-quiz-session.ts`: State machine hook handling fetching, answering, loading, error states, submitting state, and `mountedRef` guard
- `quiz-runner.tsx`: Display-only component rendering questions, choice buttons, feedback banners, and navigation
- `src/app/answer/choice-state.ts`: Pure choice variant logic helper function `choiceVariant()`

### 4. Common UI Components (`src/components/`)

- `Button.tsx`: Unified button styles with shared `buttonBaseClasses` / `buttonVariants` exported for reuse by `NavLink`
- `NavLink.tsx`: Link wrapper applying the `Button` design system (via `buttonVariants`) plus `useLinkStatus` pending feedback
- `Spinner.tsx`: Shared loading spinner (sizes `sm`/`lg`, colors `current`/`primary`) used by `Button`, `ChoiceButton`, and `LoadingState`
- `QuestionCard.tsx`: Display-only question container card (correct answer highlighting via `correctIndex`; no interactive props)
- `StatCard.tsx`: Statistics card with optional linear progress bar (`progress?: number` 0..1) for accuracy visualization; value rendered as text.
- `ProgressBar.tsx`: Shared linear progress bar component used by `StatCard` and answer screen score bar.
- `ResultBanner.tsx`: Correct/incorrect feedback banner
- `ChoiceButton.tsx`: Choice selection button with state highlights
- `EmptyState.tsx`: Empty state display
- `LoadingState.tsx`: Loading spinner/state (renders `Spinner`)
- `ErrorMessage.tsx`: Error display banner
- `src/lib/choice-label.ts`: Choice label formatter (A/B/C/D)
- `src/lib/cn.ts`: Class name combiner used across UI components
- `src/lib/error-message.ts`: `errorMessage()` helper converting unknown errors to user-facing messages

## LLM Integration

- **Model:** `gemini-3.1-flash-lite`
- **Output:** Exactly 1 question with 4 choices
- **Parameters:** Temperature 0.1, Max Tokens 512, Timeout 45s
- **Resilience:** 3 retries with exponential backoff, 2 parse retries

## Shuffle Algorithm

- Client-side Fisher-Yates shuffle applied to choices only
- Returns `{ choices: string[], choiceIndices: number[] }`

## Weighted Random Selection

- **Base weight:** 5 for unanswered questions
- **Weight formula:** `1 + 4 * (incorrectRatio)` for answered questions
- **Bonus:** +2 weight if latest answer was incorrect
- **Exclusion:** Last 10 answered question IDs
- **Pure logic module:** `src/lib/db/repository/weighting.ts` encapsulating `computeWeight()` and `pickByWeight()` functions used by `question-repository.ts`.

## Database

- **Provider:** SQLite via Turso (libSQL)
- **ORM:** Drizzle ORM
- **Tables:** `knowledge`, `questions`, `answerLogs`
- **Repositories:** `question-repository.ts`, `answer-repository.ts` (with lazy DB init in `src/lib/db/index.ts`)

## Testing

- **Unit tests:** Vitest (147 tests) covering pure logic (`weighting`, `choice-state`, `shuffle`, `choice-label`, `date`, `llm/parser`, `llm/schemas`), API orchestration (`api/client`, `api/questions`, `llm/quiz`, `answer/use-quiz-session`, `answer/quiz-runner`, `answer/page`), UI components (`Button`, `NavLink`, `ChoiceButton`, `QuestionCard`, `ResultBanner`, `StatCard`, `ProgressBar`, `EmptyState`, `LoadingState`, `ErrorMessage`, `Spinner`), and DB repositories (`question-repository`, `answer-repository`).
- **Repository tests:** Run against a real, migration-applied libSQL DB via `tests/helpers/db.ts` (`createTestDb()`), with `@/lib/db` mocked to lazily return the current test DB. File-backed temp DB (not `:memory:`) so `db.transaction()` connections share the same database.
- **Coverage gates:** `scripts/check-coverage-tiers.mjs` validates per-tier statement coverage targets from `coverage/coverage-summary.json`. No `INTENTIONALLY_MOCKED` exemptions — all files including repositories are gated. Tiers that match no files are a hard failure. Tier configuration:
  - **Tier 1: Core domain logic** — `src/lib/shuffle.ts`, `src/lib/choice-label.ts`, `src/lib/date.ts`, `src/lib/llm/schemas.ts`, `src/lib/llm/parser.ts` — target 90% statements
  - **Tier 2: API / LLM orchestration** — `src/app/api/**`, `src/lib/llm/quiz.ts`, `src/lib/llm/client.ts` — target 80% statements
  - **Tier 2b: API client & utilities** — `src/lib/api/*.ts` — target 85% statements
  - **Tier 3: Data access** — `src/lib/db/repository/*.ts` — target 75% statements
  - **Tier 4: UI state management** — `src/app/answer/**` — target 90% statements + 75% branches
  - **Tier 5: UI components** — `src/components/*.tsx` — target 70% statements
  - `src/lib/db/schema.ts` and `src/lib/db/migrations/**` are excluded from coverage instrumentation (declarative, zero branches).
- **E2E tests:** Playwright (28 tests) covering home, create, answer flows.

## Non-Functional Requirements

- Mobile-first responsive design (Tailwind v4)
- Touch-friendly buttons (`min-h-12`)
- WCAG 2.1 AA (focus-visible rings, color contrast)
- Design tokens (surface / surface-2 / muted / on-primary / shadow-card / shadow-raise / animation) centralized in `src/app/globals.css` `@theme`
- Dark mode via `prefers-color-scheme` redefining all color tokens (no manual toggle)
- Animations (`animate-rise` / `animate-pop`) applied only via `motion-safe:` variants to respect `prefers-reduced-motion`
- No result persistence for scores (in-memory analytics via `answerLogs`)

## Deployment

- Platform: Vercel / Turso
- Framework: Next.js
