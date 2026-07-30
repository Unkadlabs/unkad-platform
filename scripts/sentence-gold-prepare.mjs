// Prepare a human annotation task for Somali sentence boundaries.
//
// There is no gold standard for segmenting Somali. No Universal Dependencies
// treebank, no Punkt model, no PySBD rule set. That means the platform's
// splitter cannot be scored, and an unscored splitter is an opinion: it decides
// every public sentence count and the shape of every dataset row, on nobody's
// authority.
//
// This writes a file a reviewer can annotate by hand. The format is deliberately
// plain text rather than a web tool: annotation is a slow careful task done once
// per sample, and a text file works on any machine, needs no login, and can be
// emailed to a linguist who has never heard of this platform.
//
// The annotator's job: insert ||| at every sentence boundary. Nothing else.
// Do not fix spelling, do not reword, do not delete. The point is to record
// where sentences end in real contributed text, including the messy parts,
// because the messy parts are what a segmenter gets wrong.
//
//   THANKS_ENV=/tmp/.env.prod node scripts/sentence-gold-prepare.mjs > data/sentence-gold/unannotated.txt
//
// Sampling is deterministic: same corpus, same sample, so two annotators can be
// given the identical file and their agreement measured.

import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SAMPLE = Number(process.env.GOLD_SAMPLE ?? 40);

function loadEnv() {
  const f = process.env.THANKS_ENV || path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs.readFileSync(f, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
  );
}

const env = { ...loadEnv(), ...process.env };
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING;
const local = /localhost|127\.0\.0\.1/.test(cs ?? '');
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

const { rows } = await pool.query(
  `select s.id, s.text_so, s.sector::text sector, s.mode::text mode
     from submissions s join users u on u.id = s.user_id
    where s.status = 'accepted' and u.deleted_at is null
      and length(s.text_so) > 80`
);

// Deterministic pseudo-random order: hash the id, sort by the hash. Same input
// always yields the same sample, so a second annotator can be handed the exact
// same file and inter-annotator agreement becomes measurable.
const ordered = rows
  .map((r) => ({ ...r, h: crypto.createHash('sha256').update(r.id).digest('hex') }))
  .sort((a, b) => (a.h < b.h ? -1 : 1));

// Spread across sectors rather than taking the first N, so the sample is not
// dominated by whichever domain happens to hold the longest essays.
const perSector = new Map();
const picked = [];
for (const r of ordered) {
  const n = perSector.get(r.sector) ?? 0;
  const cap = Math.ceil(SAMPLE / 6);
  if (n >= cap) continue;
  perSector.set(r.sector, n + 1);
  picked.push(r);
  if (picked.length >= SAMPLE) break;
}

const out = [
  '# Somali sentence-boundary annotation',
  '#',
  '# Insert ||| at every sentence boundary. Change nothing else: not spelling,',
  '# not wording, not punctuation. Leave mistakes exactly as the writer made them.',
  '#',
  '# A boundary is where one complete thought ends and the next begins, whether or',
  '# not the writer used a full stop. If you are unsure, mark it and add ? on the',
  '# ITEM line so it can be discussed rather than silently guessed.',
  '#',
  '# Do NOT mark a boundary inside: a decimal (1.5), an abbreviation (iwm., Sh.),',
  '# a quotation that continues, or a line that was wrapped mid-sentence.',
  '#',
  `# ${picked.length} passages, sampled deterministically across sectors.`,
  '',
];
for (const r of picked) {
  out.push(`ITEM ${r.id} [${r.sector}/${r.mode}]`);
  out.push(r.text_so.replace(/\r/g, ''));
  out.push('END');
  out.push('');
}

console.log(out.join('\n'));
await pool.end();
