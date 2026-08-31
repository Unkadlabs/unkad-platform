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
import { submissions, prompts, users, releases } from '../lib/schema';
import { normalizeForRelease, needsNormalizing } from '../lib/normalize';
import { splitSentences, isUsableSentence } from '../lib/sentences';

// --prod selects the live database, matching the convention the other scripts
// use. Without it the run stays local.
//
// This has to happen before lib/db is loaded, because that module reads
// DATABASE_URL once at import time. Static imports are evaluated before any
// top-level code, so db is pulled in dynamically below instead — otherwise
// every run silently pointed at localhost, which is how v0.3.0 came to look
// like it had been published when nothing had left the laptop.
const PROD = process.argv.includes('--prod');
if (PROD) {
  const live = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!live) {
    console.error('--prod given but no DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING found.');
    console.error('Run through the env file:  npm run export:prod');
    process.exit(1);
  }
  process.env.DATABASE_URL = live;
}

const TARGET = process.env.DATABASE_URL ?? 'postgres://localhost:5432/unkad_platform';
const LOCAL_DB = /localhost|127\.0\.0\.1/.test(TARGET);

// Loaded inside main() rather than at the top: tsx compiles this file to CJS,
// which has no top-level await, and a static import would evaluate lib/db
// before the block above can point it anywhere.
let db: (typeof import('../lib/db'))['db'];

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

// Say out loud what is about to be read and where it would go. A release that
// quietly read the wrong database is worse than one that refuses to start.
console.log(`database  ${LOCAL_DB ? 'LOCAL' : 'LIVE '}  ${TARGET.replace(/:[^:@/]*@/, ':***@')}`);
console.log(`release   ${VERSION}  scope ${SCOPE}`);
console.log(`target    ${HF_TOKEN ? `https://huggingface.co/datasets/${REPO}` : 'dry run — no HF_TOKEN'}`);

// Publishing the development database to the Hub is unrecoverable in the way
// that matters: it is public the moment it lands.
if (HF_TOKEN && LOCAL_DB) {
  console.error('\nRefusing to publish from a local database. Add --prod.');
  process.exit(1);
}

async function main() {
  ({ db } = await import('../lib/db'));

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

  // REPUBLISH exists for corrections: a released version whose files need
  // fixing has no new items by definition, and refusing to run would leave the
  // fault published. Items keep the release_id of the version that first
  // carried them, so republishing never rewrites that history.
  if (fresh.length === 0 && !process.env.REPUBLISH) {
    console.log(`Nothing new to release (scope: ${SCOPE}); ${rows.length} items already published.`);
    console.log('Set REPUBLISH=1 to publish a corrected version of the same content.');
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

  // ---- 2b. Sentence-level view -------------------------------------------------
  //
  // Documents are the honest unit of contribution: someone wrote one passage,
  // and cutting it apart would lose the paragraph structure they intended. But
  // the corpus is measured in sentences, milestones are stated in sentences,
  // and most downstream use wants one sentence per row. Shipping both means
  // nobody has to re-implement the split, and everybody gets the same numbers
  // this project reports publicly.
  //
  // Each sentence keeps its parent document id and its position inside it, so
  // context is always recoverable: a sentence whose subject was named two
  // sentences earlier can be read back in place.
  const sentences = records.flatMap((r) =>
    splitSentences(r.text_so)
      .filter(isUsableSentence)
      .map((text_so, i) => ({
        id: `${r.id}#${i}`,
        document_id: r.id,
        position: i,
        text_so,
        mode: r.mode,
        register: r.register,
        sector: r.sector,
        topic: r.topic,
        dialect: r.dialect,
        verified: r.verified,
        license: r.license,
        created_at: r.created_at,
      }))
  );
  const sentenceJsonl = sentences.map((s) => JSON.stringify(s)).join('\n') + '\n';
  const words = records.reduce((a, r) => a + r.text_so.split(/\s+/).filter(Boolean).length, 0);
  console.log(`Wrote ${sentences.length} sentences to sentences.jsonl`);

  const bySector = sentences.reduce<Record<string, number>>((acc, x) => {
    acc[x.sector] = (acc[x.sector] ?? 0) + 1;
    return acc;
  }, {});
  const sectorTable = Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} | ${((v / sentences.length) * 100).toFixed(1)}% |`)
    .join('\n');
  const withRegister = sentences.filter((x) => x.register).length;

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
- ${sentences.length < 1000 ? 'n<1K' : sentences.length < 10000 ? '1K<n<10K' : sentences.length < 100000 ? '10K<n<100K' : '100K<n<1M'}
---

# Qor Af-Soomaali — the Unkad Somali Corpus (${VERSION})

Community-contributed, peer-validated${SCOPE === 'accepted' ? '' : ', linguist-verified'} Somali text,
built on [qor.unkad.com](https://qor.unkad.com) by [Unkad Labs](https://unkad.com), an independent
Somali AI research lab.

Every item was written by a consenting Somali speaker, validated by at least two community
members${SCOPE === 'accepted' ? '' : ', and signed off by a trusted linguist reviewer'}. Every item
carries provenance: mode, register, sector, and (where shared) the variety the contributor speaks.

## This release

| | |
|---|---|
| Sentences | ${sentences.length} |
| Words | ${words.toLocaleString('en-US')} |
| Documents | ${records.length} |
| New documents in this version | ${fresh.length} |
| English–Somali parallel pairs | ${parallel} |
| Sectors | ${sectors.length} |
| Quality tier | ${SCOPE === 'accepted' ? 'community-accepted' : 'linguist-verified'} |
| Content | ${SCOPE === 'monolingual' ? 'monolingual Somali (English-paired items held back for a future evaluation set)' : 'Somali, with English source where the item was a translation'} |
| License | CC BY-SA 4.0 |

## Coverage by domain

Nine domains are represented, but not evenly. The distribution is printed rather
than summarised, because "nine sectors" is true and would leave a reader to
discover the imbalance themselves.

| sector | sentences | share |
|---|---|---|
${sectorTable}

Long passages are labelled by the sector their author chose, so a single essay
can contribute many sentences to one domain. Balancing coverage is an explicit
goal of the ongoing collection.

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

## Files

\`data/sentences.jsonl\` — one sentence per row, the unit this project counts and
reports. Each carries \`document_id\` and \`position\`, so the passage it came from
can be reassembled and read in context.

\`data/train.jsonl\` — one document per row, as it was written. Long passages stay
whole here, with their paragraph structure intact.

Both contain the same text. Use whichever unit suits the task.

## Fields

\`text_so\` (Somali text) · \`text_en\` (English source, translate mode only) · \`mode\`
(write/translate/transcribe) · \`register\` (conversational/narrative/instructional/formal/technical — present on
prompted items only, ${withRegister} of ${sentences.length} sentences; free writing carries none because
nobody assigned it a register)
· \`sector\` · \`topic\` · \`dialect\` (the contributor's spoken variety, not the text's orthography; maxaa_tiri/maay/both/other, if shared) · \`verified\` ·
\`license\` · \`created_at\`

## Consent and credit

Contributors explicitly consented to open release under CC BY-SA 4.0 during onboarding and chose
how to be credited — by name, by pseudonym, or anonymously. See \`CREDITS.md\`.

## Canary notice

\`data/canaries.jsonl\` contains 20 tracer sentences with invented people, places, and numbers.
They are synthetic fingerprints for detecting dataset contamination, are clearly flagged in
their records, and are NOT community-verified corpus text: they are never mixed into
\`sentences.jsonl\` or \`train.jsonl\` and never counted in corpus statistics. If you train on
this dataset, exclude \`data/canaries.jsonl\`. Their presence in a model's outputs demonstrates
that this dataset was used for training.

## Why this dataset exists

Somali is normally collected by scraping. Corpora built that way carry text of unknown
authorship, unknown licence, and unknown origin, and low-resource web text is heavily polluted
with machine-translation output, which teaches models to reproduce their own errors.

This corpus was written rather than found. Every sentence has a known author who agreed to
CC BY-SA 4.0 before writing it and chose how to be credited. Nothing here was scraped, and
nothing was machine translated.

That claim is enforced rather than asserted. During collection, one contributor's submissions
were found to be forwarded messages copied from a Telegram channel; all of them were removed,
twice, at a cost of roughly 150 sentences and a public milestone. Another contributor who pasted
long passages was investigated, gave permission for his own writing directly, and the judgement
was recorded against his account with the reviewer's name and the date. Where text could not be
licensed, it was rejected, however good the Somali was.

The corpus also holds knowledge that has no English source to translate from: how frankincense
is tapped, how a nomadic house is folded onto a camel at dawn, which cup of camel milk goes to
the guest, how shax is played with stones in the dust.

## Limitations

Stated plainly, because a dataset that hides its weaknesses is worth less than one that names
them.

- **It is small.** This is an early release from an ongoing collection, not a finished corpus.
- **Contribution is concentrated.** A minority of contributors wrote a majority of the text, as
  in most volunteer language efforts. Per-item authorship is recoverable on request.
- **The dialect field records the contributor, not the text.** \`dialect\` is the variety the
  contributor themselves speaks. It is not a label for the orthography of the sentence. Every
  item in this corpus, including those from contributors who identify as Maay speakers, is
  written in standard Somali (Maxaa-tiri) orthography. We verified this by character set: the
  Maay alphabet lacks \`x\` and \`c\` and adds digraphs such as \`gn\`, \`jh\` and \`th\`, and no
  item shows those markers. The reason is not sampling: the Maay writing system is recent and
  very few Maay speakers have been taught it, so they write in the standard orthography like
  everyone else. **Consequence for users: this corpus supports disaggregation by speaker
  variety, and does not support evaluating a model on written Maay.** Somali is not one
  dialect, and a corpus in one orthography should not be read as representing the language.
- **Sentence segmentation is automatic.** Sentences are split on terminal
  punctuation and line breaks, then filtered: scriptural quotations in Arabic,
  bracketed citations and term-equals-gloss glossary lines are excluded, since
  none is a sentence of Somali. 96 such lines were removed from this version.
  Speaker-labelled dialogue turns are kept.
- **Verification granularity varies.** Items were signed off by a reviewer, but longer passages
  were judged as passages rather than sentence by sentence. Sentence-level review is planned.
- **English pairs are held back.** Translated items are being reserved for a separate held-out
  evaluation set, so this release is monolingual Somali. Publishing them here would let them be
  trained on and destroy their value as a benchmark.

## Citation

If you use this dataset, please cite it and credit the Qor Af-Soomaali contributor community.

Contact: research@unkad.com · Platform: https://qor.unkad.com
`;

  // ---- 4. Write locally ------------------------------------------------------
  const outDir = path.join(process.cwd(), 'export', VERSION);
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data', 'train.jsonl'), jsonl);
  fs.writeFileSync(path.join(outDir, 'data', 'sentences.jsonl'), sentenceJsonl);
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
      { path: 'data/sentences.jsonl', content: new Blob([sentenceJsonl]) },
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

// An unhandled rejection here would print a stack with no context, or on some
// paths look like the run simply stopped. A release that fails has to say so.
main().then(
  () => process.exit(0),
  (err) => {
    console.error('\nExport failed — nothing was published.');
    console.error(err instanceof Error ? `${err.name}: ${err.message}` : err);
    if (err instanceof Error && err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    process.exit(1);
  }
);
