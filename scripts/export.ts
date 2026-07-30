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
import { normalizeForRelease, needsNormalizing } from '../lib/normalize';

const HF_ORG = process.env.HF_ORG ?? 'unkadlabs';
const HF_DATASET = process.env.HF_DATASET ?? 'qor-af-soomaali';
const VERSION = process.env.VERSION ?? 'v0.1.0';
// 'monolingual' is the safe default for a public corpus release: verified
// items that carry no English pair. The paired items are the benchmark's raw
// material, and a benchmark whose sentences were previously published as a
// corpus measures nothing, because anyone could have trained on them. Holding
// them back costs a small release today and protects the evaluation set that is
// the lab's actual contribution.
const SCOPE = (process.env.SCOPE ?? 'monolingual') as 'monolingual' | 'verified' | 'accepted';
const HF_TOKEN = process.env.HF_TOKEN;

const REPO = `${HF_ORG}/${HF_DATASET}`;

async function main() {
  // ---- 1. Collect the release rows -----------------------------------------
  const where =
    SCOPE === 'monolingual'
      ? and(
          eq(submissions.status, 'accepted'),
          sql`${submissions.verifiedAt} is not null`,
          isNull(submissions.textEn)
        )
      : SCOPE === 'verified'
        ? and(eq(submissions.status, 'accepted'), sql`${submissions.verifiedAt} is not null`)
        : eq(submissions.status, 'accepted');

  // LEFT join on prompts: proverb-mode items are contributed freely and carry
  // no prompt, so an inner join would silently drop every proverb from the
  // release. Their register/topic are simply unset.
  // Everything in scope, not only the unreleased part. The published files are
  // cumulative: `data/train.jsonl` is the whole dataset as of this version,
  // which is what someone calling load_dataset expects to receive, and older
  // versions stay reachable through the Hub's own git history.
  //
  // Uploading only the new items would overwrite the file with them and shrink
  // the dataset on every release: v0.2 would replace a hundred items with the
  // forty added since v0.1. The release_id stamp still records which release
  // first carried an item, so `fresh` below is what is genuinely new.
  const rows = await db
    .select({ s: submissions, p: prompts, u: users })
    .from(submissions)
    .leftJoin(prompts, eq(submissions.promptId, prompts.id))
    .innerJoin(users, eq(submissions.userId, users.id))
    .where(where);

  const fresh = rows.filter((r) => r.s.releaseId === null);

  if (fresh.length === 0) {
    console.log(`Nothing new to release (scope: ${SCOPE}); ${rows.length} items already published.`);
    process.exit(0);
  }

  // Published text is normalised; the stored row is not. Phone keyboards and
  // chat apps substitute curly apostrophes, non-breaking hyphens and
  // non-breaking spaces, which read identically and tokenize differently, so a
  // model answering with ordinary punctuation would score wrong against them.
  const touched = rows.filter(({ s }) => needsNormalizing(s.textSo)).length;

  const records = rows.map(({ s, p }) => ({
    id: s.id,
    text_so: normalizeForRelease(s.textSo),
    text_en: s.textEn ? normalizeForRelease(s.textEn) : null,
    // Proverbs carry an explanation of meaning and usage; other modes don't.
    meaning_en: s.meaningEn ? normalizeForRelease(s.meaningEn) : null,
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

  // ---- 1b. Multi-reference view ---------------------------------------------
  // Several contributors translate the same English source, so the corpus
  // already holds many valid Somali renderings per sentence. The flat file
  // above loses that: each variant looks like an unrelated row.
  //
  // Grouping them is what makes the data usable for translation evaluation.
  // Scoring a model against a single reference punishes any correct wording the
  // one annotator did not happen to choose, which is why single-reference sets
  // understate low-resource systems. It also yields paraphrase pairs, and a
  // human-to-human variance baseline: without knowing how much two Somali
  // speakers differ, a model's score cannot be interpreted at all.
  //
  // promptId is already the grouping key. Nothing new needed in the schema.
  const groups = new Map<
    string,
    { source_en: string; sector: string; register: string | null; refs: Array<{ text_so: string; dialect: string | null; verified: boolean }> }
  >();
  for (const { s: sub, p } of rows) {
    if (sub.mode !== 'translate' || !sub.promptId || !p?.sourceText) continue;
    const g = groups.get(sub.promptId) ?? {
      source_en: p.sourceText,
      sector: sub.sector ?? p.sector ?? 'general',
      register: p.register ?? null,
      refs: [],
    };
    g.refs.push({
      text_so: normalizeForRelease(sub.textSo),
      dialect: sub.dialect ?? null,
      verified: sub.verifiedAt !== null,
    });
    groups.set(sub.promptId, g);
  }

  const multiRef = [...groups.values()]
    .filter((g) => g.refs.length > 1)
    .map((g) => ({
      source_en: g.source_en,
      references_so: g.refs.map((r) => r.text_so),
      n_references: g.refs.length,
      // Distinct renderings, so a reader can tell genuine variation from
      // several people arriving at the same sentence. Counted on normalised,
      // case-folded text: three people writing the same words with different
      // capitalisation are agreement, not variation, and counting them as
      // three references would overstate how much the corpus actually covers.
      n_distinct: new Set(g.refs.map((r) => r.text_so.trim().toLowerCase())).size,
      dialects: [...new Set(g.refs.map((r) => r.dialect).filter(Boolean))],
      sector: g.sector,
      register: g.register,
    }));

  const multiRefJsonl = multiRef.map((r) => JSON.stringify(r)).join('\n') + '\n';

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

Community-contributed, peer-validated${SCOPE === 'accepted' ? '' : ', linguist-verified'} Somali text,
built on [qor.unkad.com](https://qor.unkad.com) by [Unkad Labs](https://unkad.com) — a non-profit
AI research laboratory in Mogadishu, Somalia.

Every item was written by a consenting Somali speaker, validated by at least two community
members${SCOPE === 'accepted' ? '' : ', and signed off by a trusted linguist reviewer'}. Every item
carries provenance: mode, register, sector, and (where shared) the contributor's dialect.

## This release

| | |
|---|---|
| Items | ${records.length} |
| New in this version | ${fresh.length} |
| English–Somali parallel pairs | ${parallel} |
| Sectors | ${sectors.join(', ')} |
| Quality tier | ${SCOPE === 'accepted' ? 'community-accepted' : 'linguist-verified'} |
| Content | ${SCOPE === 'monolingual' ? 'monolingual Somali (English-paired items held back for a future evaluation set)' : 'Somali, with English source where the item was a translation'} |
| License | CC BY-SA 4.0 |

## Text normalisation

Published text is normalised so that punctuation does not become a source of
false errors when scoring a model. Phone keyboards and chat applications
substitute characters that read identically and encode differently: curly
apostrophes and quotes, non-breaking hyphens and spaces, zero-width
characters. Those are replaced with their ordinary equivalents, runs of spaces
are collapsed, and the ellipsis character becomes three dots. ${touched} of
${records.length} items in this release were affected.

Nothing else is altered. Letters, vowels and the apostrophe marking the Somali
glottal stop are untouched; en and em dashes are kept, since contributors use
them deliberately. The platform stores every contribution exactly as it was
written, so the original text of any item remains recoverable.

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
  if (multiRef.length) {
    fs.writeFileSync(path.join(outDir, 'data', 'multi_reference.jsonl'), multiRefJsonl);
  }
  fs.writeFileSync(path.join(outDir, 'README.md'), card);
  fs.writeFileSync(path.join(outDir, 'CREDITS.md'), credits);
  console.log(`Wrote ${records.length} records to ${outDir}`);
  if (multiRef.length) {
    const refs = multiRef.reduce((n, g) => n + g.n_references, 0);
    console.log(`Wrote ${multiRef.length} multi-reference groups (${refs} renderings) to multi_reference.jsonl`);
  }

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
    commitTitle: `Release ${VERSION} (${records.length} items, ${fresh.length} new, ${SCOPE})`,
    files: [
      { path: 'data/train.jsonl', content: new Blob([jsonl]) },
      ...(multiRef.length
        ? [{ path: 'data/multi_reference.jsonl', content: new Blob([multiRefJsonl]) }]
        : []),
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

  for (const r of fresh) {
    await db
      .update(submissions)
      .set({ releaseId: release.id })
      .where(eq(submissions.id, r.s.id));
  }
  console.log(
    `Recorded release ${VERSION} (${release.id}): ${records.length} items published, ${fresh.length} newly stamped.`
  );
}

main().then(() => process.exit(0));
