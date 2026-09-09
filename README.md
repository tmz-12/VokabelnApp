# VokabelnApp

VokabelnApp is the PostgreSQL-backed, multi-user learning application specified in `SPEC.md`. It ships the validated Aspekte neu C1/C2 dataset, a durable flashcard queue, per-user vocabulary state and overrides, three interface locales, and server-side XP/streak/milestone logic.

## Requirements

- Node.js 22+
- pnpm 11+
- Docker Desktop (or another PostgreSQL 17+ server)

## Local setup

1. Copy `.env.example` to `.env` and replace `BETTER_AUTH_SECRET` with at least 32 random characters.
2. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

3. Install, migrate, and seed:

   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```

4. Run the app at [http://localhost:3000](http://localhost:3000):

   ```bash
   pnpm dev
   ```

The seed is repeatable. It validates and imports exactly 3,450 vocabulary records: 3,270 C1, 180 C2, 350 priority entries, ten Kapitel, and the intentionally unassigned `die Klette` record. `data/seed/aspekte_neu_c1_c2_vocabulary_app.json` is the canonical runtime dataset; the original PDF is never parsed by the app.

## Verification

With PostgreSQL running and seeded:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Playwright uses installed Google Chrome on Windows when available, otherwise its managed Chromium (install with `pnpm exec playwright install chromium`). Set `PLAYWRIGHT_CHROME_PATH` for a custom executable. Tests exercise registration/onboarding, learning and requeues, refresh/resume, favorites, overrides/reset, localization, two-account isolation, keyboard controls, light/dark themes, reduced motion, and 320/768/1440px layouts.

Set `PLAYWRIGHT_BASE_URL` to test an already-running production build instead of the default development server at port 3000. The auth server's `BETTER_AUTH_URL` must match that origin. Use a dedicated test database: E2E tests register synthetic accounts; database integration tests clean up their own isolated test users.

To verify the database contents directly:

```sql
select level, count(*) from vocabulary group by level order by level;
select count(*) from vocabulary where is_key;
select count(*) from vocabulary where chapter_id is null;
```

Expected results are C1 `3270`, C2 `180`, priority `350`, and unassigned `1`.

## Architecture and security

- Next.js App Router, strict TypeScript, React, Tailwind CSS, and `next-intl`
- PostgreSQL with Drizzle migrations and an idempotent Zod-validated seed
- Better Auth email/password sessions using its CSRF/session protections
- Every user mutation derives the identity from the server session; clients never submit a user ID or XP amount
- Canonical vocabulary is shared and immutable to normal users; favorites, status, overrides, sessions, XP, activity, and badges are user-scoped
- XP is append-only and protected by per-event dedupe keys
- Study answers are serialized per user and include a cursor to reject stale/replayed submissions
- Manual first-known transitions use the same one-time XP and milestone rules as study answers
- Onboarding stores the browser's IANA timezone for user-local daily goals and streaks
- Session snapshots preserve before/after C1 progress and levels for the completion screen
- User override input is length-limited and validated server-side

The checked-in migration is under `drizzle/`. The database schema lives in `src/db/schema.ts`, domain rules in `src/features/*/domain.ts`, and authenticated server mutations in `src/features/app/actions.ts`.

## Deployment follow-up

Set production `DATABASE_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and a strong secret, run migrations and the seed during deployment, and terminate TLS at the platform edge. Password reset and email verification are intentionally left as a mail-provider integration follow-up; the Better Auth verification table and auth architecture support adding them without a schema redesign.

The Compose credentials and published database port are for local development only. Production requires private database networking, a least-privilege database account, backups and a tested restore procedure. Do not deploy `.env`, `.postgres-dev`, synthetic QA accounts, or test reports as application assets.

See `QA_REPORT.md` for verified checks and outstanding release gates. A successful local production build is not a claim that a hosted production environment has been deployed or secured.
