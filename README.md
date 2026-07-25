# The Unkad Platform · Qor Af-Soomaali

**Open-source infrastructure for building open, quality-controlled text corpora for
low-resource languages — by the community that speaks them.**

Live instance: **[qor.unkad.com](https://qor.unkad.com)** — where Somali speakers are
building an open Somali corpus, sentence by sentence. Built and operated by
[Unkad Labs](https://unkad.com), a non-profit AI research laboratory in Mogadishu,
Somalia. *Unkad* is Somali for "creation from nothing."

This repo is the whole platform. If your language is missing from the digital record,
you can deploy your own instance in under an hour — see
[Deploy this for your language](#deploy-this-for-your-language).

## How it works

Contributors work in four modes (named in Somali on our instance):

| Mode | | What contributors do |
|---|---|---|
| **Qor** | write | Respond to prompts — stories, instructions, dialogues — in the target language |
| **Turjun** | translate | Translate short source sentences, producing parallel data |
| **Guuri** | transcribe | Type up openly licensed / public-domain printed material |
| **Hubi** | validate | Review others' submissions: is this correct, natural language? |

**Two-tier quality pipeline.** Every submission needs agreement from two independent
peer validators (2 approvals → accepted, 2 rejections → rejected, splits escalate).
Accepted items then pass to trusted **linguist reviewers** for batch sign-off before
they count as verified corpus. Nobody reviews their own work; one vote per person per
item, enforced by the database.

**Consent first.** Before contributing anything, every contributor completes a
three-step onboarding — account, language profile (dialect, region), and an explicit
consent step where they accept the open license and choose how to be credited: by
name, by pseudonym, or anonymously. Contribution is impossible before consent.

**Provenance-complete data.** Every item carries its mode, register
(conversational / narrative / instructional / formal / technical), sector (health,
education, agriculture, law, media, religion, culture, technology), contributor
dialect, license, validation history, and eventually its release version.

**Versioned open releases.** `npm run export` builds a dataset release — JSONL with
full provenance, an auto-generated dataset card, and a CREDITS file honoring each
contributor's consent choice — and pushes it to the Hugging Face Hub
([ours](https://huggingface.co/unkadlabs) ships under CC BY-SA 4.0).

Also included: reputation and streaks, a public leaderboard with deterministic
cell-grid identicons, a public live-stats API (`/api/stats`) for embedding campaign
progress, an admin console (prompt batches, source registry, roles, coverage,
audit log), rate limiting, lockout protection, and a bilingual (Somali-first,
English toggle) phone-first UI.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Postgres with Drizzle ORM
(generated, committed migrations) · cookie-session auth with hashed tokens ·
hand-written CSS (no framework) · zero paid dependencies — runs on Vercel + Neon
free tiers.

## Local development

```bash
createdb unkad_platform           # requires local Postgres
cp .env.example .env.local
npm install
npm run db:migrate                # apply committed migrations
npm run db:seed                   # dev admin + starter prompts
npm run dev                       # http://localhost:3000
```

Seeded dev admin: the seeded dev admin — **dev only; rotate
immediately in any shared environment.**

## Deploy this for your language

1. **Fork** this repo.
2. **Translate the UI**: all strings live in [`lib/i18n.ts`](lib/i18n.ts) as a
   two-language dictionary (`so`/`en` on our instance) — swap in your language.
3. **Write prompts** for your language's registers and sectors
   ([`docs/prompt-bank.md`](docs/prompt-bank.md) is our 180-prompt template) and load
   them via the admin console.
4. **Provision**: create a free [Neon](https://neon.tech) Postgres, run
   `npm run db:migrate && npm run db:seed` against it, deploy to
   [Vercel](https://vercel.com) with `DATABASE_URL` set, and rotate the admin
   password.
5. **Appoint linguist reviewers** (admin console → Roles) and open your pilot.

The consent flow, validation thresholds, dialect field, and sector list are all
plain TypeScript — adapt them to your language community's reality. If you deploy an
instance, we'd genuinely love to hear about it: research@unkad.com.

## Data model

`users` (profile, dialect, consent + credit choice, reputation) · `sessions`
(hashed tokens) · `prompts` (mode/register/sector/topic) · `sources` (verified
public-domain registry for transcription) · `submissions` (text + provenance
snapshots + license) · `validations` (one verdict per person per item) ·
`releases` (versioned dataset exports) · `audit_log` (append-only record of
privileged actions) — see [`lib/schema.ts`](lib/schema.ts).

## A note on the Somali strings

Somali UI strings and seed prompts are drafts pending review by trusted Somali
reviewers (marked `VERIFY SOMALI` in the source). Corrections are very welcome —
open a PR.

## License

Code: [Apache-2.0](LICENSE). Data produced by our instance: CC BY-SA 4.0, released
at [huggingface.co/unkadlabs](https://huggingface.co/unkadlabs).

Built in Mogadishu. <span lang="so">Ereyada waa hanti.</span> <!-- VERIFY SOMALI -->
