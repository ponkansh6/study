# src/app/

## Responsibility

Next.js App Router pages and REST API routes for the 1-knowledge-1-question endless learning app.

## Structure

- `layout.tsx` — Root layout with global navigation header and Tailwind CSS v4 styling
- `page.tsx` — Home page (server component displaying aggregate learning stats via `getStats()`)
- `globals.css` — Global CSS and Tailwind imports
- `create/page.tsx` — Knowledge creation and question generation client form
- `answer/` — Endless quiz answer flow
  - `page.tsx` — Page wrapper
  - `quiz-runner.tsx` — Display component for question, choices, and immediate feedback
  - `use-quiz-session.ts` — Quiz session state machine hook with mount guarding
- `api/` — REST API routes
  - `questions/route.ts` — POST (generate question from knowledge text)
  - `questions/random/route.ts` — GET (fetch weighted random question with exclusion)
  - `answers/route.ts` — POST (submit answer, record answer log, return feedback)
