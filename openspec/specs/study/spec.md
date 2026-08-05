# Study - 1-Knowledge-1-Question Endless Learning Specification

## Overview

Study is a Next.js application that transforms knowledge text into interactive 4-choice questions using the Google Gemini API. The app follows an endless learning model (1 knowledge item = 1 generated question) featuring a weighted random question selection algorithm (苦手優先) and continuous answer logging to track overall statistics.

## Data Model

```typescript
// Database (Drizzle ORM / Turso)
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
**THEN** server component displays aggregate learning stats (`totalQuestions`, `totalAnswers`, `overallAccuracy`) via direct call to `getStats()` from `answer-repository`, with navigation links to `/create` and `/answer`.

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

- Server component displaying learning statistics (問題数 / 解答数 / 正答率) directly fetched via `getStats()`
- Navigation links to `/create` and `/answer`
- Shared header via `src/app/layout.tsx`

### 2. `/create` (Create - `src/app/create/page.tsx`)

- Client component with textarea input for knowledge text
- Submits text via API client, generates 1 question, displays result with correct answer highlighted and links to continue

### 3. `/answer` (Answer - `src/app/answer/page.tsx`, `use-quiz-session.ts`, `quiz-runner.tsx`)

- Thin page wrapper rendering `QuizRunner`
- `use-quiz-session.ts`: State machine hook handling fetching, answering, loading, error states, submitting state, and `mountedRef` guard
- `quiz-runner.tsx`: Display-only component rendering questions, choice buttons, feedback banners, and navigation

### 4. Common UI Components (`src/components/`)

- `Button.tsx`: Unified button styles
- `QuestionCard.tsx`: Question container card
- `ResultBanner.tsx`: Correct/incorrect feedback banner
- `ChoiceButton.tsx`: Choice selection button with state highlights
- `EmptyState.tsx`: Empty state display
- `LoadingState.tsx`: Loading spinner/state
- `ErrorMessage.tsx`: Error display banner
- `src/lib/choice-label.ts`: Choice label formatter (A/B/C/D)

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

## Database

- **Provider:** SQLite via Turso (libSQL)
- **ORM:** Drizzle ORM
- **Tables:** `knowledge`, `questions`, `answerLogs`
- **Repositories:** `question-repository.ts`, `answer-repository.ts` (with lazy DB init in `src/lib/db/index.ts`)

## Non-Functional Requirements

- Mobile-first responsive design (Tailwind v4)
- Touch-friendly buttons (`min-h-12`)
- WCAG 2.1 AA (focus-visible rings, color contrast)
- No result persistence for scores (in-memory analytics via `answerLogs`)

## Deployment

- Platform: Vercel / Turso
- Framework: Next.js
