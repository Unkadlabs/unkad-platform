# The Unkad Platform

Community platform for building an open, quality-controlled Somali text corpus. Somali speakers contribute in four modes — **Qor** (write), **Turjun** (translate), **Guuri** (transcribe), **Hubi** (validate) — and peer validation decides what enters the corpus. All accepted data is released under CC BY-SA 4.0.

Built by [Unkad Labs](https://unkad.com). Sibling repo: `unkad-website` (the marketing site). This platform is open-source infrastructure — other low-resource language communities are welcome to deploy their own instance.

## Stack

- **Next.js 15** (App Router, TypeScript, server actions — full-stack, no separate API)
- **Postgres** via **Drizzle ORM** (local Postgres for dev, [Neon](https://neon.tech) for production)
- Cookie-session auth (email + password, bcrypt) — no external auth provider
- Hand-written CSS sharing the unkad.com design tokens; phone-first; Somali-first UI with English toggle

## Local development

```bash
createdb unkad_platform           # requires local Postgres
cp .env.example .env.local        # default local connection string
npm install
npm run db:push                   # create tables from lib/schema.ts
npm run db:seed                   # admin account + starter prompts
npm run dev                       # http://localhost:3000
```

Seeded dev admin: `admin@unkad.com` / `unkad-admin-dev` — **dev only, change in any shared environment.**

## Deploy (Vercel + Neon)

1. Create a Neon project; copy the connection string.
2. `vercel link`, set `DATABASE_URL` in Vercel project env (Production + Preview).
3. Run `DATABASE_URL=<neon-url> npm run db:push && DATABASE_URL=<neon-url> npm run db:seed` once.
4. Push to `main` — Vercel deploys. Point `qor.unkad.com` at the project.

## How validation works

- Contributors submit; each submission needs **2 peer approvals** to be accepted or **2 rejections** to be rejected.
- A 1–1 split escalates to **trusted reviewers** (role `reviewer`), whose single vote settles it.
- Nobody validates their own work; one vote per person per submission (DB-enforced).
- Reputation: +2 per accepted submission, +1 per validation cast.

Roles (`contributor` / `reviewer` / `admin`) are set in the `users` table; promote trusted reviewers with SQL for now:
`update users set role = 'reviewer' where email = '...';`

## Data model

`users` · `sessions` · `prompts` (mode, register, topic, Somali/English text, source text/ref) · `submissions` (the contributed Somali text + provenance + license) · `validations` (one verdict per user per submission). See [lib/schema.ts](lib/schema.ts).

Register coverage (conversational / narrative / instructional / formal / technical) and topic are first-class prompt fields so the admin dashboard can steer contributors toward gaps — coverage targets, not just volume.

## Somali UI strings

All UI strings live in [lib/i18n.ts](lib/i18n.ts) with `so` and `en` variants. **Every Somali string is a draft flagged `VERIFY SOMALI`** — trusted reviewers must review them (and the seed prompts in [scripts/seed.ts](scripts/seed.ts)) before public launch.

## Roadmap (from the concept note)

- **Now (weeks 1–3):** Write + Validate end-to-end, Somali UI, staging deploy ✓
- **Weeks 4–5:** Translate + Transcribe polish, reputation tuning, admin coverage analytics
- **Weeks 6–7:** closed pilot (30–50 invited contributors), first 5,000 validated sentences
- **Phase 2 (explicitly out of MVP):** audio collection, native apps, payments, HF export automation, third-party API
