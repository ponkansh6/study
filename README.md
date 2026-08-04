# Study - Quiz Generator

A Next.js application that transforms knowledge text into interactive 4-choice quiz sets using Google Gemini API.

## Features

- 📝 **Text to Quiz**: Paste any knowledge text and get a 10-question quiz
- 🔄 **Dynamic Shuffling**: Questions and choices are randomized on each view
- ⚡ **Instant Feedback**: See results immediately without page reload
- 💾 **Quiz History**: Access previously created quizzes anytime

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 6
- **Database**: Drizzle ORM + Turso (libSQL)
- **LLM**: Google Gemini API
- **UI**: React 19, CSS Modules
- **Testing**: Vitest, Playwright
- **Tooling**: pnpm, ESLint, Oxlint, Prettier

## Getting Started

### Prerequisites

- Node 24+
- pnpm 11.9.0
- Google API key (get one at https://aistudio.google.com/app/apikey)
- Turso database (existing one or create at https://turso.tech)

### Setup

1. **Clone and install**:
   ```bash
   cd study
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```
   GOOGLE_API_KEY=your-key-here
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-token-here
   ```

3. **Initialize database**:
   ```bash
   pnpm db:push
   ```

4. **Run development server**:
   ```bash
   pnpm dev
   ```

   Open http://localhost:3000

## Usage

1. Enter knowledge text in the textarea
2. Click "Generate Quiz"
3. Answer 10 multiple-choice questions
4. View results and explanations
5. Access previous quizzes from the home page

## Available Scripts

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test:all         # Run all tests
pnpm test:watch       # Watch mode
pnpm test:e2e         # Run E2E tests
pnpm lint:fast        # Lint with oxlint
pnpm format:fast      # Format with oxfmt
pnpm type-check       # TypeScript type check
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
```

## Project Structure

```
src/
  app/              # Next.js pages and API routes
  lib/              # Utilities (db, llm, shuffle)
  types/            # TypeScript types
tests/              # Test suites
.github/workflows/  # CI/CD pipeline
openspec/           # Specification documents
```

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Google Gemini API key |
| `TURSO_DATABASE_URL` | Turso database connection URL |
| `TURSO_AUTH_TOKEN` | Turso authentication token |

## Database Schema

### quiz_sets
- `id` (integer, PK)
- `title` (text) — Auto-generated from input text
- `sourceText` (text) — Original input text
- `createdAt` (timestamp)

### questions
- `id` (integer, PK)
- `quizSetId` (integer, FK → quiz_sets)
- `orderIndex` (integer) — Generation order
- `question` (text)
- `choices` (JSON) — Array of 4 strings
- `correctIndex` (integer) — 0-3
- `explanation` (text, optional)

## Development

### Adding a Feature

1. Update `/openspec/specs/study/spec.md` with requirements
2. Implement code changes
3. Run `pnpm lint:fast && pnpm type-check && pnpm test:all`
4. Commit with descriptive message

### Running Tests

```bash
# Unit tests
pnpm test:all

# Watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e

# UI browser
pnpm test:ui
```

### Git Hooks

Pre-commit runs: `lint:fast` → `format:fast` → `type-check:fast` → `lint-staged`
Pre-push runs: Full test suite

## Deployment

Designed for Vercel deployment. Connect repository to Vercel and set environment variables:
- `GOOGLE_API_KEY`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

## License

Private project. All rights reserved.
