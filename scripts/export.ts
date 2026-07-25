// ============================================================================
// Dataset export: versioned releases of the Unkad Somali corpus.
//
// Queries accepted (optionally linguist-verified-only) submissions, writes
// a Hugging Face-ready dataset (JSONL + dataset card + contributor credits
// honoring each contributor's consent choice), records a `releases` row,
// stamps exported items with the release id, and pushes to the HF Hub.
//
// Usage:
//   HF_ORG=unkadlabs HF_DATASET=... VERSION=v0.1.0 npm run export         # verified only (default)
//   SCOPE=accepted VERSION=v0.1.0 npm run export                          # all community-accepted
//   npm run export                                                        # dry run to ./export/ if no HF_TOKEN
//
// The HF token is read from HF_TOKEN in the environment (.env.local works
// for local runs). It is never stored in the repo.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { submissions, prompts, users, releases } from '../lib/schema';

const HF_ORG = process.env.HF_ORG ?? 'unkadlabs';
const HF_DATASET = process.env.HF_DATASET ?? 'qor-af-soomaali';
const VERSION = process.env.VERSION ?? 'v0.1.0';
const SCOPE = (process.env.SCOPE ?? 'verified') as 'verified' | 'accepted';
const HF_TOKEN = process.env.HF_TOKEN;

const REPO = `${HF_ORG}/${HF_DATASET}`;

async function main() {
  // ---- 1. Collect the release rows -----------------------------------------
  const where =
    SCOPE === 'verified'
      ? and(eq(submissions.status, 'accepted'), sql`${submissions.verifiedAt} is not null`)
      : eq(submissions.status, 'accepted');

  // LEFT join on prompts: proverb-mode items are contributed freely and carry
  // no prompt, so an inner join would silently drop every proverb from the
  // release. Their register/topic are simply unset.
  const rows = await db
    .select({ s: submissions, p: prompts, u: users })
    .from(submissions)
    .leftJoin(prompts, eq(submissions.promptId, prompts.id))
    .innerJoin(users, eq(submissions.userId, users.id))
    .where(and(where, isNull(submissions.releaseId)));

  if (rows.length === 0) {
    console.log(`Nothing to release (scope: ${SCOPE}, unreleased only).`);
    process.exit(0);
  }

  const records = rows.map(({ s, p }) => ({
    id: s.id,
    text_so: s.textSo,
    text_en: s.textEn ?? null,
    // Proverbs carry an explanation of meaning and usage; other modes don't.
    meaning_en: s.meaningEn ?? null,
    mode: s.mode,
    register: p?.register ?? null,
    sector: s.sector ?? p?.sector ?? 'general',
    // Free writes carry the contributor's own topic; prompted items the prompt's.
    topic: s.topic ?? p?.topic ?? null,
    dialect: s.dialect ?? null,
    verified: s.verifiedAt !== null,
    license: s.license,
    created_at: s.createdAt.toISOString().slice(0, 10),
  }));

  const jsonl = records.map((r) => JSON.stringify(r)).join('\n') + '\n';

  // ---- 2. Contributor credits (respecting consent choices) ------------------
  const byUser = new Map<string, { name: string | null; count: number }>();
  for (const { s, u } of rows) {
    const name =
      u.creditChoice === 'anonymous'
        ? null
        : u.creditChoice === 'real_name'
          ? (u.creditName ?? u.handle)
          : u.handle;
    const entry = byUser.get(s.userId) ?? { name, count: 0 };
    entry.count++;
    byUser.set(s.userId, entry);
  }
  const named = [...byUser.values()].filter((c) => c.name !== null);
  const anonymous = [...byUser.values()].filter((c) => c.name === null);

  const credits = [
    '# Contributors',
    '',
    `This release was written and validated by the Qor Af-Soomaali community.`,
    '',
    ...named
      .sort((a, b) => b.count - a.count)
      .map((c) => `- ${c.name} (${c.count} ${c.count === 1 ? 'item' : 'items'})`),
    ...(anonymous.length > 0
      ? ['', `…and ${anonymous.length} contributor(s) who chose to remain anonymous.`]
      : []),
    '',
  ].join('\n');

  // ---- 3. Dataset card -------------------------------------------------------
  const sectors = [...new Set(records.map((r) => r.sector))].sort();
  const parallel = records.filter((r) => r.text_en).length;

  const card = `---
license: cc-by-sa-4.0
language:
- so
- en
pretty_name: Qor Af-Soomaali — Unkad Somali Corpus
tags:
- somali
- low-resource
- community-contributed
- unkad
size_categories:
- ${records.length < 1000 ? 'n<1K' : records.length < 10000 ? '1K<n<10K' : '10K<n<100K'}
---

# Qor Af-Soomaali — the Unkad Somali Corpus (${VERSION})

Community-contributed, peer-validated${SCOPE === 'verified' ? ', linguist-verified' : ''} Somali text,
built on [qor.unkad.com](https://qor.unkad.com) by [Unkad Labs](https://unkad.com) — a non-profit
AI research laboratory in Mogadishu, Somalia.

Every item was written by a consenting Somali speaker, validated by at least two community
members${SCOPE === 'verified' ? ', and signed off by a trusted linguist reviewer' : ''}. Every item
carries provenance: mode, register, sector, and (where shared) the contributor's dialect.

## This release

| | |
|---|---|
| Items | ${records.length} |
| English–Somali parallel pairs | ${parallel} |
| Sectors | ${sectors.join(', ')} |
| Quality tier | ${SCOPE === 'verified' ? 'linguist-verified' : 'community-accepted'} |
| License | CC BY-SA 4.0 |

## Fields

\`text_so\` (Somali text) · \`text_en\` (English source, translate mode only) · \`mode\`
(write/translate/transcribe) · \`register\` (conversational/narrative/instructional/formal/technical)
· \`sector\` · \`topic\` · \`dialect\` (maxaa_tiri/maay/both/other, if shared) · \`verified\` ·
\`license\` · \`created_at\`

## Consent and credit

Contributors explicitly consented to open release under CC BY-SA 4.0 during onboarding and chose
how to be credited — by name, by pseudonym, or anonymously. See \`CREDITS.md\`.

## Citation

If you use this dataset, please cite it and credit the Qor Af-Soomaali contributor community.

Contact: research@unkad.com · Platform: https://qor.unkad.com
`;

  // ---- 4. Write locally ------------------------------------------------------
  const outDir = path.join(process.cwd(), 'export', VERSION);
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data', 'train.jsonl'), jsonl);
  fs.writeFileSync(path.join(outDir, 'README.md'), card);
  fs.writeFileSync(path.join(outDir, 'CREDITS.md'), credits);
  console.log(`Wrote ${records.length} records to ${outDir}`);

  if (!HF_TOKEN) {
    console.log('No HF_TOKEN set — dry run only (nothing pushed, no release recorded).');
    process.exit(0);
  }

  // ---- 5. Push to the Hugging Face Hub ----------------------------------------
  const { createRepo, uploadFiles } = await import('@huggingface/hub');
  const repo = { type: 'dataset' as const, name: REPO };

  try {
    await createRepo({ repo, accessToken: HF_TOKEN, private: false });
    console.log(`Created dataset repo ${REPO}`);
  } catch {
    console.log(`Dataset repo ${REPO} exists — uploading new version.`);
  }

  await uploadFiles({
    repo,
    accessToken: HF_TOKEN,
    commitTitle: `Release ${VERSION} (${records.length} items, ${SCOPE})`,
    files: [
      { path: 'data/train.jsonl', content: new Blob([jsonl]) },
      { path: 'README.md', content: new Blob([card]) },
      { path: 'CREDITS.md', content: new Blob([credits]) },
    ],
  });
  const hfUrl = `https://huggingface.co/datasets/${REPO}`;
  console.log(`Pushed to ${hfUrl}`);

  // ---- 6. Record the release and stamp items -----------------------------------
  const [release] = await db
    .insert(releases)
    .values({ version: VERSION, itemCount: records.length, hfUrl, notes: `scope: ${SCOPE}` })
    .returning();

  for (const r of records) {
    await db
      .update(submissions)
      .set({ releaseId: release.id })
      .where(eq(submissions.id, r.id));
  }
  console.log(`Recorded release ${VERSION} (${release.id}) and stamped ${records.length} items.`);
}

main().then(() => process.exit(0));
