// Corpus shape for the poster: how many sentences exist, how many people made
// them, and which of those people consented to be named.
//
// Sentence counting matches lib/sentences.ts, and the consent rule matches
// thanks-data.mjs: 'handle' or 'real_name' may be printed, everything else is
// counted and never named.
//
//   node scripts/corpus-data.mjs > /tmp/corpus.json

import { Pool } from 'pg';
// One definition of a sentence, shared with the app and the exporter.
import { splitSentences as split, isUsableSentence as usable, countSentences as count } from '../lib/sentences.mjs';
import fs from 'fs';
import path from 'path';

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
const host = (cs?.match(/@([^/:]+)/) || [, 'unknown'])[1];
const pool = new Pool({
  connectionString: cs,
  ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
});


const { rows } = await pool.query(
  `select u.id, u.handle, u.credit_choice::text cc, u.credit_name,
          s.text_so, s.status::text st, s.sector::text sector
   from submissions s join users u on u.id = s.user_id
   where u.deleted_at is null`
);

// Real sentences, for designs made out of the corpus rather than about it.
// Accepted only, and never from the account whose provenance is unresolved:
// this text gets printed, so it has to be text the project can stand behind.
const BULK = '6a05bb51-4e08-4d54-932c-2dc69dc7106d';
const lines = [];
for (const r of rows) {
  if (r.st !== 'accepted' || r.id === BULK) continue;
  for (const line of split(r.text_so).filter(usable)) lines.push(line);
}

// Sentences per domain, across everything. Unlike `lines`, this is not
// restricted: a coverage figure that quietly excluded a third of the corpus
// would be a different claim than the one it appears to make.
const sectors = {};
for (const r of rows) {
  const k = r.sector ?? 'general';
  sectors[k] = (sectors[k] ?? 0) + split(r.text_so).filter(usable).length;
}
await pool.end();

const by = new Map();
for (const r of rows) {
  const n = split(r.text_so).filter(usable).length;
  const cur = by.get(r.id) ?? { handle: r.handle, cc: r.cc, name: r.credit_name, n: 0 };
  cur.n += n;
  by.set(r.id, cur);
}

const contributors = [...by.values()].filter((x) => x.n > 0);
const sentences = contributors.reduce((a, x) => a + x.n, 0);
const named = contributors
  .filter((x) => x.cc === 'handle' || x.cc === 'real_name')
  .map((x) => (x.cc === 'real_name' ? x.credit_name || x.handle : x.handle).trim())
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, 'so'));

process.stdout.write(
  JSON.stringify({ sentences, people: contributors.length, named, lines, sectors }, null, 2) + '\n'
);
console.error(
  `[${host}] ${sentences} sentences · ${contributors.length} people · ` +
  `${named.length} nameable · ${lines.length} printable lines`
);
