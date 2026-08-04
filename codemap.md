# study/

## Responsibility

Quiz generation application that transforms knowledge text into 4-choice quiz sets using Google Gemini API. Users input text, get a 10-question quiz, and receive immediate feedback on their answers.

## Design

**Architecture Pattern**: Server-driven LLM integration + Client-side quiz runner

- LLM-based question generation via Google Gemini (JSON-structured output)
- Database persistence via Drizzle ORM + Turso
- Client-side shuffling and in-browser scoring (no persistence)
- Next.js App Router for routing and API handling

**Key Design Patterns**:

- **Data Flow**: Input → LLM → DB ← Fetch → Display → Shuffle → Score (browser)
- **Component Composition**: Server components for data fetching, client components for interactivity
- **Error Handling**: Structured error responses from API, user-friendly UI feedback
- **Validation**: Zod schemas for LLM output + API inputs

**Abstractions**:

- `src/lib/llm/quiz.ts`: LLM orchestration (prompt → validation → response)
- `src/lib/db/repository/quiz-repository.ts`: Database operations (CRUD)
- `src/lib/shuffle.ts`: Fisher-Yates shuffling for questions and choices
- `src/app/quiz/[id]/QuizRunner.tsx`: Quiz flow state management

**Architectural Decisions**:

- Generate quiz immediately after LLM succeeds (no multi-step approval)
- Shuffle at client runtime (not stored in DB) for variety on retake
- No result persistence in v1 (simplicity; scores lost on reload)
- Use `responseMimeType: "application/json"` with Zod validation for structured LLM output

## Flow

**Quiz Generation Flow**:

1. User inputs knowledge text on home page
2. `POST /api/quiz-sets` triggered
3. `generateQuizQuestions(sourceText)` calls Gemini API
4. `parseWithRetry` validates JSON against Zod schema (retry on failure)
5. On success: `createQuizSet` saves to Turso DB (transaction)
6. Response: quiz ID → client redirects to `/quiz/[id]`

**Quiz Display & Answer Flow**:

1. User navigates to `/quiz/[id]` (server component)
2. `getQuizSet(id)` fetches questions from DB
3. Pass questions to `QuizRunner` (client component)
4. `shuffleQuestionsAndChoices` randomizes question order + choice positions
5. User clicks answer choices (state tracked in `answers` array)
6. On submit: compare user answers vs correct indices → calculate score
7. Display results (correct/incorrect per question + explanation)

## Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 6 (strict mode)
- **UI**: React 19, CSS Modules
- **Database**: Drizzle ORM + Turso (libSQL)
- **LLM**: `@google/generative-ai` (Gemini API)
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **Lint/Format**: ESLint (flat config), Oxlint, Oxfmt, Prettier
- **Package Manager**: pnpm 11.9.0

## Dependencies Summary

**Runtime**:

- `next` (16.2.9), `react` (19.2.7), `react-dom` (19.2.7)
- `@google/generative-ai`, `@libsql/client`, `drizzle-orm`, `zod`, `p-limit`

**Dev**:

- Testing: `vitest`, `@playwright/test`, `@testing-library/react`
- Lint: `eslint`, `eslint-config-next`, `oxlint`, `prettier`, `oxfmt`
- Tools: `typescript`, `tsx`, `ts-node`, `drizzle-kit`

## File Structure

```
src/
  app/
    page.tsx           # Home: text input + quiz list
    layout.tsx         # Root layout
    globals.css        # Global styles
    page.module.css    # Home page styles
    api/
      quiz-sets/
        route.ts       # POST (generate), GET (list)
        [id]/route.ts  # GET (single quiz)
    quiz/
      [id]/
        page.tsx       # Server component (fetch + render)
        QuizRunner.tsx # Client component (quiz flow)
        styles.module.css
  lib/
    constants.ts
    shuffle.ts
    llm/
      client.ts        # Gemini API wrapper
      schemas.ts       # Zod schemas
      parser.ts        # parseWithRetry
      prompts.ts       # QUIZ_GENERATION_PROMPT
      quiz.ts          # generateQuizQuestions
    db/
      index.ts         # Drizzle + Turso setup
      schema.ts        # Table definitions
      repository/
        quiz-repository.ts
  types/
    quiz.ts            # TypeScript interfaces

tests/
  setup.ts
  e2e/
    (playwright tests)

.github/workflows/main.yml  # CI/CD pipeline
.husky/                      # Git hooks
vitest.config.ts             # Vitest config
playwright.config.ts         # Playwright config
drizzle.config.ts            # Drizzle migration config
openspec/                     # Spec-driven development
AGENTS.md / CLAUDE.md        # Agent orchestration rules
```

## Testing Strategy

- **Unit**: Utilities (shuffle, validation) via Vitest
- **Integration**: API routes + DB operations (mocked or in-memory)
- **E2E**: Playwright: text input → quiz generation → quiz flow → results

## Performance Considerations

- Lazy load quiz sets on home page (paginated if many)
- Shuffle at render time (O(n) Fisher-Yates, fast for 10 questions)
- LLM timeouts: 45s for generation (user-facing timeout in form)
- Database queries: index on `quiz_sets.createdAt` for list ordering
