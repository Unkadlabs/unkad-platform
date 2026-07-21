// Build the Maahmaahyo dataset release from data/maahmaahyo/maahmaahyo.tsv.
//
// Dry run (default): writes export/maahmaahyo/{maahmaahyo.jsonl, README.md}
// Publish:           PUSH=1 npm run maahmaahyo:build   (requires HF_TOKEN;
//                    only run after reviewer verification and the go-ahead)
//
// Rows whose `verified_by` column is empty are EXCLUDED from a push —
// nothing unverified ever ships.

import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'maahmaahyo', 'maahmaahyo.tsv');
const OUT = path.join(ROOT, 'export', 'maahmaahyo');

type Row = {
  id: string;
  proverb_so: string;
  translation_en: string;
  meaning_en: string;
  dialect: string;
  notes: string;
  verified_by: string;
};

function readRows(): Row[] {
  const lines = fs.readFileSync(SRC, 'utf8').split('\n').filter(Boolean);
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])) as Row;
  });
}

function card(count: number, verifiedCount: number): string {
  return `---
license: cc-by-sa-4.0
language:
- so
- en
pretty_name: Maahmaahyo — Somali Proverbs
tags:
- somali
- proverbs
- folklore
- low-resource
- unkad
size_categories:
- n<1K
---

# Maahmaahyo — Somali Proverbs

A curated, reviewer-verified collection of Somali proverbs (maahmaahyo) with
English translations, meanings, and dialect notes. Somali carries one of the
world's great oral traditions; proverbs are its most concentrated form. This
dataset writes a piece of that tradition down, openly.

Curated by [Unkad Labs](https://unkad.com), a non-profit AI research laboratory
in Mogadishu. Every entry is verified by a named Somali reviewer before release.

## Fields

| Field | Description |
|---|---|
| \`id\` | stable identifier |
| \`proverb_so\` | the proverb, in Somali |
| \`translation_en\` | literal English translation |
| \`meaning_en\` | the sense in which the proverb is used |
| \`dialect\` | \`maxaa_tiri\` / \`maay\` / \`both\` |
| \`notes\` | attestation and usage notes |

## This release

${count} proverbs, of which ${verifiedCount} reviewer-verified.

Proverbs are folklore — the shared inheritance of the Somali-speaking world.
This compilation (translations, meanings, notes, and selection) is released
under CC BY-SA 4.0 so it stays shared.

Related: [Qor Af-Soomaali](https://qor.unkad.com) ·
[awesome-somali-nlp](https://github.com/unkadlabs/awesome-somali-nlp) ·
research@unkad.com
`;
}

async function main() {
  const rows = readRows();
  const verified = rows.filter((r) => r.verified_by);
  const push = process.env.PUSH === '1';

  // A push ships only verified rows; a dry run includes everything so the
  // team can see the full working set.
  const shipping = push ? verified : rows;

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, 'maahmaahyo.jsonl'),
    shipping.map((r) => JSON.stringify(r)).join('\n') + '\n'
  );
  fs.writeFileSync(path.join(OUT, 'README.md'), card(shipping.length, verified.length));

  console.log(`rows: ${rows.length} total, ${verified.length} verified`);
  console.log(`wrote ${OUT} (${push ? 'PUSH mode' : 'dry run'})`);

  if (!push) {
    console.log('Dry run only — set PUSH=1 to publish to unkadlabs/maahmaahyo.');
    return;
  }
  if (verified.length === 0) {
    throw new Error('Refusing to push: no verified rows.');
  }

  const { createRepo, uploadFiles } = await import('@huggingface/hub');
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error('HF_TOKEN not set');
  const repo = { type: 'dataset' as const, name: 'unkadlabs/maahmaahyo' };

  try {
    await createRepo({ repo, accessToken: token, license: 'cc-by-sa-4.0' });
  } catch {
    /* exists */
  }
  await uploadFiles({
    repo,
    accessToken: token,
    commitTitle: `Maahmaahyo release: ${verified.length} verified proverbs`,
    files: [
      {
        path: 'maahmaahyo.jsonl',
        content: new Blob([fs.readFileSync(path.join(OUT, 'maahmaahyo.jsonl'), 'utf8')]),
      },
      {
        path: 'README.md',
        content: new Blob([fs.readFileSync(path.join(OUT, 'README.md'), 'utf8')]),
      },
    ],
  });
  console.log('published: https://huggingface.co/datasets/unkadlabs/maahmaahyo');
}

main();
