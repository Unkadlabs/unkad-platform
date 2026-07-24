# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Unkad Platform (`qor.unkad.com`) — Somali speakers building an open, quality-controlled
Somali text corpus. Next.js 15 App Router, server actions, Postgres via Drizzle, cookie-session
auth, hand-written CSS. Zero paid dependencies (Vercel + Neon free tiers). The sibling repo
`../dhiblabs` is the marketing site (`unkad.com`) and consumes this app's `/api/stats`.

This is a **full-stack app** — `next.config.ts` is intentionally empty, unlike the site repo's
static export.

## Commands

```bash
npm run dev            # http://localhost:3000
npm run build          # production build (also the only real typecheck — see below)
npm run db:generate    # generate a migration after editing lib/schema.ts
npm run db:migrate     # apply committed migrations
npm run db:seed        # dev admin (admin@unkad.com / unkad-admin-dev) + starter prompts
npm run db:studio      # Drizzle Studio
npm run export         # dataset release → Hugging Face (see below)
./scripts/backup.sh    # manual pg_dump of production
```

There is **no test suite and no lint script**. `npx tsc --noEmit` or `npm run build` is the
verification step for any change. Local dev needs Postgres (`createdb unkad_platform`) and
`.env.local` with `DATABASE_URL`.

## Architecture

**Everything server-side lives in `lib/`; pages are thin.** Route pages are async server
components that call a guard, resolve language, query, and render. Mutations are server actions
in `lib/actions.ts` — there are no API routes for writes (`app/api/stats/route.ts` is the only
route handler, and it's public/read-only).

- `lib/schema.ts` — the whole data model, heavily commented with the design goals it enforces.
  Postgres enums are the source of truth for modes, registers, sectors, dialects, roles.
  Migrations are **generated and committed** to `drizzle/`, never pushed ad hoc. Soft deletes
  (`users.deletedAt`) so corpus rows survive account deletion.
- `lib/auth.ts` — sessions store only a SHA-256 hash of a 32-byte token; the raw token lives
  only in the `unkad_session` httpOnly cookie. Guards `requireUser` / `requireOnboarded` /
  `requireRole('reviewer'|'admin')` redirect rather than throw, and are used by both pages and
  actions. Roles are ranked (contributor < reviewer < admin), so `requireRole('reviewer')`
  admits admins.
- `lib/actions.ts` — auth, onboarding, contribution, validation, admin. Actions return an i18n
  **key** (e.g. `'errRateLimited'`) for form errors, or `redirect(...)` with a query param for
  page-level outcomes; the page maps those to translated strings.
- `lib/i18n.ts` — the full so/en dictionary and `makeT(lang)`. `lib/lang.ts` reads the
  `unkad_lang` cookie; **Somali is the default**, English is the toggle.
- `lib/stats.ts` — read-model queries (corpus progress, streaks, coverage) plus the admin
  monitoring models behind `/admin/activity` (activity series, submission breakdowns,
  per-contributor engagement, pipeline health, prompt supply). `CORPUS_GOAL` is the public
  100k-validated-sentences campaign target.
- `lib/ratelimit.ts` — DB-backed fixed windows (works across serverless instances) and
  **fails open** on DB errors.
- `app/globals.css` — one hand-written stylesheet (~1100 lines), design tokens at the top,
  shared with the site repo (same teal accent, serif voice, mono apparatus). No CSS framework;
  no component libraries. Theme is pre-painted by an inline script in `app/layout.tsx`.

### Invariants worth preserving

- **Consent gates contribution.** `requireOnboarded` demands both `consentAt` and
  `onboardingCompletedAt`. Never add a contribution path that bypasses it.
- **Validation policy** (`lib/actions.ts`): 2 peer approvals accept · 2 rejections reject ·
  a 1–1 split escalates · a reviewer/admin vote settles escalations. Nobody validates their own
  work, one vote per person per item — enforced by `validations_unique_voter` in the DB, not just
  in code.
- **Two tiers.** Peer-accepted (`status = 'accepted'`) is not the same as linguist-verified
  (`verifiedAt` set, via `/review`). Releases default to verified-only.
- **Privileged actions are audited.** Any new admin/reviewer capability should `audit(...)` into
  the append-only `audit_log` the way the existing ones do.
- **Never lose a contributor's text.** A failed submit redirects back to the mode page with an
  `?error=` reason (drafts are cleared only on `?done=<promptId>`, client-side via `ClearDraft`).
  This was a real bug once; keep the pattern.

## Dataset releases

`npm run export` collects unreleased submissions, writes JSONL + an auto-generated dataset card
+ a CREDITS file honoring each contributor's `creditChoice` (handle / real name / anonymous),
records a `releases` row, stamps items with the release id, and pushes to Hugging Face.
Without `HF_TOKEN` it's a dry run into `export/`. `SCOPE=accepted` widens it from verified-only.

The **Maahmaahyo** proverb dataset is a separate, founder-curated track: TSV in
`data/maahmaahyo/`, built by `npm run maahmaahyo:build` (needs `PUSH=1` to publish), rendered to
social cards by `npm run maahmaahyo:cards`. Rows with an empty `verified_by` are mechanically
excluded from any push. See `docs/maahmaahyo.md`.

## Somali text

All Somali strings in `lib/i18n.ts` and `scripts/seed.ts` are marked `!! VERIFY SOMALI !!` —
drafts pending founder/reviewer review. Don't silently rewrite Somali copy; flag it. Somali
passages in markup get `lang="so"`.

## Known rough edges

- `scripts/maahmaahyo-cards.tsx` hardcodes `FONTS = /Users/khalidyusufdahir/research/dhiblabs/assets/fonts`,
  which no longer exists — the site repo moved to `research/unkad/dhiblabs`.
- Anything joining `submissions` to `prompts` must use a **left** join: proverb-mode items have
  `promptId = null`, and an inner join silently drops them from releases and breakdowns.
- Deploys go through the Vercel app, not GitHub Actions (the workflows were deliberately
  removed). Backups run locally via `scripts/com.unkad.backup.plist` (launchd) using a versioned
  `pg_dump 17` binary — Neon runs Postgres 17 while local Homebrew Postgres is 16.
- Neon skills are vendored under `.claude/skills/` and `.agents/skills/`, pinned by
  `skills-lock.json`.
