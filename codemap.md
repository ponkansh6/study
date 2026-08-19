# study/

## Responsibility

Study is a Next.js 16 application that transforms knowledge text into interactive 4-choice questions using the Google Gemini API. The application operates on an endless learning model (1 knowledge item = 1 generated question) with weighted random question selection (苦手優先), instant feedback, and continuous answer logging.

## Design

**Architecture Pattern**: Server-driven LLM generation + Client-side state machine quiz runner

- LLM-based question generation via Google Gemini (JSON-structured output validated by Zod)
- Database persistence via Drizzle ORM + Turso (SQLite)
- Client-side shuffling (Fisher-Yates) and answer submission with immediate visual feedback
- Next.js App Router for routing and API handling

**Key Design Patterns**:

- **Data Flow**: Input → LLM → DB (`question-repository`) ← Fetch Random → Display (`quiz-runner`) → Submit Answer (`answer-repository`)
- **Component Composition**: Server components for data fetching/stats, client components for interactive quiz loop and creation form
- **Error Handling**: Structured API responses (`ok`/`fail`), Zod request/response validation, robust retry with backoff (`sleep.ts`)
- **UI System**: Tailwind CSS v4 with reusable UI components (`Button`, `QuestionCard`, `ResultBanner`, `ChoiceButton`, etc.)

**Abstractions**:

- `src/lib/llm/quiz.ts`: LLM orchestration (prompt → validation → response)
- `src/lib/db/repository/question-repository.ts`: Question creation and weighted random picking (4-axis: accuracy, miss bonus, mastery decay, recency)
- `src/lib/db/repository/answer-repository.ts`: Answer logging and stats calculation
- `src/app/answer/use-quiz-session.ts`: Quiz session state machine hook
- `src/components/`: Reusable design system components

## Flow

**Question Generation Flow**:

1. User inputs knowledge text on `/create`
2. `POST /api/questions` triggered
3. `generateQuestion(sourceText)` calls Gemini API
4. `parseWithRetry` validates JSON against Zod schema
5. `createKnowledgeWithQuestion` saves knowledge and question to Turso DB
6. Client displays success view with option to create another or practice

**Endless Quiz & Answer Flow**:

1. User visits `/answer`
2. `use-quiz-session` fetches random weighted question (`GET /api/questions/random`) excluding recent IDs
3. Choices are shuffled via Fisher-Yates (`shuffleChoices`)
4. User selects a choice and submits (`POST /api/answers`)
5. Backend records `answerLog` and returns correctness, explanation, and correct index
6. UI displays feedback banner (正解！/不正解), marks user wrong selection, highlights correct answer, and loads next question upon request

## Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 6 (strict mode)
- **UI**: React 19, Tailwind CSS v4
- **Database**: Drizzle ORM + Turso (libSQL)
- **LLM**: `@google/generative-ai` (Gemini API)
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **Package Manager**: pnpm 11.9.0

## File Structure

```
src/
  app/
    page.tsx               # Home: aggregate stats + navigation links
    layout.tsx             # Root layout with shared header
    globals.css            # Tailwind CSS v4 imports
    create/
      page.tsx             # Knowledge input and question generation
    answer/
      page.tsx             # Answer page wrapper
      quiz-runner.tsx      # Display runner for quiz question & feedback
      use-quiz-session.ts  # Quiz session state machine hook
    api/
      questions/
        route.ts           # POST (generate question)
        random/route.ts    # GET (weighted random question)
      answers/
        route.ts           # POST (submit answer & log)
  components/              # Reusable UI components (Button, QuestionCard, ResultBanner, etc.)
  lib/
    sleep.ts               # Shared sleep utility
    choice-label.ts        # Choice letter formatting (A/B/C/D)
    api/
      client.ts            # Client-side API fetch wrappers
      response.ts          # API response helper (ok/fail)
      schemas.ts           # Zod request/response schemas
    llm/
      client.ts            # Gemini API wrapper
      schemas.ts           # Zod schemas for generation
      parser.ts            # parseWithRetry
      prompts.ts           # Question generation prompt
      quiz.ts              # generateQuestion
    db/
      index.ts             # Drizzle + Turso lazy init setup
      schema.ts            # SQLite table definitions
      repository/
        question-repository.ts # Question creation & random picker
        answer-repository.ts   # Answer logging & stats
  types/
    quiz.ts                # TypeScript interfaces

tests/                     # Vitest and Playwright test suites
openspec/                  # Specification documents
```
