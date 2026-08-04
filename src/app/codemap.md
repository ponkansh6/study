# src/app/

## Responsibility

Next.js App Router pages and API routes for quiz generation, listing, and viewing.

## Structure

- `layout.tsx` — Root layout with global styling
- `page.tsx` — Home page (text input form + quiz list)
- `globals.css` — Global CSS variables and base styles
- `page.module.css` — Home page component styles
- `api/` — REST API routes
  - `quiz-sets/route.ts` — POST (generate quiz), GET (list quizzes)
  - `quiz-sets/[id]/route.ts` — GET (fetch specific quiz with questions)
- `quiz/[id]/` — Quiz answer page
  - `page.tsx` — Server component (fetch quiz, pass to client runner)
  - `QuizRunner.tsx` — Client component (shuffle, answer tracking, results)
  - `styles.module.css` — Quiz page styling
