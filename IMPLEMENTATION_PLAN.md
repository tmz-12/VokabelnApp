# VokabelnApp V1 implementation plan

This plan is subordinate to `SPEC.md` and records the build sequence and architectural decisions made before screen implementation.

## 1. Foundation

- Next.js App Router, strict TypeScript, Tailwind CSS, `next-intl`, Better Auth, Zod.
- PostgreSQL through Docker Compose; Drizzle schema and checked-in SQL migrations.
- Auth-owned `user`, `session`, `account`, and `verification` tables plus an application profile keyed by auth user ID.
- Canonical source files extracted from the supplied bundle; runtime and seed code never reads the ZIP or original PDF.
- Idempotent seed validates exact totals and upserts only shared canonical content and badge definitions.

## 2. Data and authorization

- Shared tables: collections, chapters, vocabulary, badges.
- User-owned tables: profiles, vocabulary state, overrides, sessions/items, XP ledger, daily activity/review IDs, earned badges.
- Every mutation derives the user ID from the server session, validates input, and scopes reads/writes to that identity.
- Canonical content remains immutable to normal users; effective vocabulary is a canonical row merged with that user's optional override.

## 3. Learning domain

- Pure tested functions for translation priority, level thresholds, progress, streaks, item selection, queue insertion, and effective-content merging.
- Persist an ordered presentation queue, attempt/requeue counts, base membership, outcomes, and cursor so refresh resumes exactly.
- `continue` orders learning by oldest review then new by source order; other modes filter deterministically.
- Server-side answering updates state, daily unique reviews, deduplicated XP, milestones, and the durable queue transactionally.

## 4. Information architecture

- Locale routes for auth, onboarding, journey home, chapter, study, search, favorites, and settings.
- Four primary destinations only: Journey, Search, Favorites, Settings.
- Desktop uses a rail; mobile uses a labeled bottom navigation. Study remains a focused nested flow.
- Word detail preserves list/search context in a desktop side sheet and mobile full-height sheet.

## 5. Visual system

- The distinctive element is an editorial Kapitel atlas: a plotted SVG route with offset chapter stations, restrained progress energy, and concise expandable annotations.
- Surrounding content uses quiet planes and typographic hierarchy rather than a kit of rounded statistic cards.
- Colors, typography, spacing, radii, elevation, icon sizes, focus, and motion are semantic tokens with independently tuned light/dark values.
- Mobile-first from 320px; 44px targets; visible labels/errors/focus; no hover-only information; reduced-motion equivalence.

## 6. Verification gates

- Typecheck, lint, unit and integration tests after each domain phase.
- Clean migration plus seed assertion against all 3,450 entries, chapter distributions, priority totals, and unassigned record.
- Playwright coverage for registration/onboarding/session, persistence, favorites, override, locale, and isolation.
- Browser QA at phone, tablet, desktop, light, dark, reduced motion, Chinese copy, long German strings, dense chapter lists, and empty/error/loading states.

