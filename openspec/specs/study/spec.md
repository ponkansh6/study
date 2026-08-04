# Study - Quiz Generator Specification

## Overview

Study is a Next.js application that transforms knowledge text into interactive 4-choice quizzes using Google Gemini API. Users paste knowledge content, receive a 10-question quiz set, and can answer and review results immediately in the browser.

## Data Model

```typescript
// Database (Drizzle ORM / Turso)
interface QuizSet {
  id: number;
  title: string;
  sourceText: string;
  createdAt: Date;
}

interface Question {
  id: number;
  quizSetId: number;
  orderIndex: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

// Client-side runtime (not persisted)
interface ShuffledQuestion {
  id: number;
  originalIndex: number;
  question: string;
  choices: string[]; // order shuffled
  choiceIndices: number[]; // mapping to original indices
  correctChoiceIndex: number; // position of correct answer in shuffled order
  explanation?: string;
}
```

## Requirements

### R1: Text-to-Quiz Generation

**WHEN** user submits knowledge text via form on home page
**THEN** POST /api/quiz-sets triggers Gemini to generate exactly 10 questions

- Each question has 4 choices with 1 correct answer
- Correct answer position varies (0-3) naturally
- JSON validated via Zod schema
- On parse failure, retry with exponential backoff (max 2 retries)
- Title auto-generated from first 100 chars of input

### R2: Quiz Persistence

**WHEN** LLM generation succeeds
**THEN** quiz set + all 10 questions saved to Turso DB

- Rollback on partial write failure
- `quiz_sets` table: id, title, sourceText, createdAt
- `questions` table: id, quizSetId, orderIndex, question, choices[], correctIndex, explanation

### R3: Quiz Retrieval & Display

**WHEN** user navigates to `/quiz/[id]`
**THEN** server fetches quiz set from DB

- GET /api/quiz-sets returns all quiz sets (descending by createdAt)
- GET /api/quiz-sets/[id] returns quiz set with 10 questions in DB order

### R4: Client-Side Shuffle

**WHEN** QuizRunner component mounts with questions
**THEN** Fisher-Yates shuffles:

- Question order (shuffle indices)
- Each question's choice order (shuffle positions)
- Track mapping so correctChoiceIndex stays valid post-shuffle

### R5: Quiz Answer Flow

**WHEN** user views quiz page
**THEN** display 10-question flow:

- 1 question + 4 clickable choice buttons per screen
- Navigation: Previous/Next buttons, question indicators (1-10)
- Selected choices remain highlighted
- Submit button appears on question 10, disabled until all 10 answered

### R6: Results Display (No Persistence)

**WHEN** user submits all answers
**THEN** show results immediately:

- Score: X/10 correct
- For each question: user answer, correct answer (if wrong), explanation
- No DB write (client-side only, lost on page reload)

### R7: Home Page

**WHEN** user visits `/`
**THEN** display:

- Text input form ("Knowledge Text")
- Submit button ("Generate Quiz")
- List of previous quiz sets (title, createdAt), clickable to retake

## API Specification

### POST /api/quiz-sets

**Request:**

```json
{
  "sourceText": "string (required, non-empty)"
}
```

**Response (201):**

```json
{
  "id": 123
}
```

**Response (400/500):**

```json
{
  "error": "string (reason)"
}
```

**Flow:**

1. Validate sourceText (non-empty)
2. Call generateQuizQuestions(sourceText)
3. On success: createQuizSet(title, sourceText, questions)
4. Return quiz ID → client redirects to /quiz/[id]

### GET /api/quiz-sets

**Response (200):**

```json
[
  { "id": 1, "title": "...", "createdAt": "ISO8601" },
  ...
]
```

### GET /api/quiz-sets/[id]

**Response (200):**

```json
{
  "id": 1,
  "title": "...",
  "sourceText": "...",
  "createdAt": "ISO8601",
  "questions": [
    {
      "id": 1,
      "question": "...",
      "choices": [...],
      "correctIndex": 0,
      "explanation": "..."
    },
    ...
  ]
}
```

**Response (404):**

```json
{
  "error": "Quiz set not found"
}
```

## Components

### src/app/page.tsx

Home page (use client)

- TextArea for knowledge text input
- Submit button (disabled while loading)
- Error display
- Quiz set list (clickable, routes to /quiz/[id])

### src/app/quiz/[id]/page.tsx

Quiz page (server component)

- Fetches quiz set from DB
- Renders QuizRunner with questions

### src/app/quiz/[id]/QuizRunner.tsx

Quiz runner (use client)

- Shuffles questions on mount
- Tracks user answers
- Handles navigation (prev/next)
- Displays results on submit

## LLM Integration

**Model:** gemini-3.1-flash-lite
**Temperature:** 0.1 (deterministic)
**Max Tokens:** 2000
**Timeout:** 45s
**Retries:** 3 (exponential backoff, 2s base)
**Parse Retries:** 2

**Prompt:** Generate exactly 10 questions from provided text. Each question: `{ question, choices: [4], correctIndex, explanation? }`

**Validation:** Zod schema validates JSON structure + array length.

## Database

**Provider:** Turso (libSQL)
**ORM:** Drizzle

**Tables:**

- `quiz_sets`: id, title, sourceText, createdAt
- `questions`: id, quizSetId, orderIndex, question, choices (JSON), correctIndex, explanation

## Non-Functional Requirements

- **Performance:** Quiz generation < 30s (user-facing timeout)
- **Accessibility:** WCAG 2.1 AA (button labels, color contrast, focus states)
- **Mobile:** Responsive design (touch-friendly buttons, readable on small screens)
- **Error Handling:** Graceful fallback for API errors (user-friendly messages, retry option)
- **Security:** Input validation on all endpoints, SQL injection prevention (Drizzle built-in)

## Deployment

- **Platform:** Vercel
- **Build Command:** `pnpm build`
- **Framework:** Next.js
- **Environment:** GOOGLE_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
