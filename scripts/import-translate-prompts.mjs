// Load English source sentences from data/translate-sources.tsv as translate
// prompts, INACTIVE by default so they form a reserve rather than dumping
// hundreds of tasks on contributors at once.
//
// Translate prompts are the one kind safe to bulk-load: only source_text
// varies, and it is English. The Somali instruction is a single constant
// already live on the platform, reused verbatim, so importing a thousand of
// these introduces no unverified Somali. Write prompts are different and must
// stay human-written.
//
//   node scripts/import-translate-prompts.mjs            # dry run, shows what would load
//   node scripts/import-translate-prompts.mjs --commit   # actually insert
//
// Re-running is safe: anything whose source_text already exists is skipped.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const COMMIT = process.argv.includes('--commit');
const TSV = path.join(process.cwd(), 'data', 'translate-sources.tsv');

// Verbatim from the prompts already in production. Not retranslated.
const INSTRUCTION_SO = 'U turjun jumladan af-Soomaali.';
const INSTRUCTION_EN = 'Translate this sentence into Somali.';

const SECTORS = ['health','education','agriculture','law','media','religion','culture','technology','general'];
const REGISTERS = ['conversational','narrative','instructional','formal','technical'];

function loadEnv() {
  const f = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs.readFileSync(f, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
  );
}

const rows = fs.readFileSync(TSV, 'utf8').split('\n').filter(Boolean).slice(1)
  .map((line, i) => {
    const [sector, register, topic, source_text] = line.split('\t');
    return { line: i + 2, sector, register, topic, source_text };
  });

// Validate before touching the database. A bad enum value would fail mid-insert
// and leave a partial import, which is worse than not starting.
const bad = rows.filter(
  (r) => !SECTORS.includes(r.sector) || !REGISTERS.includes(r.register) || !r.source_text?.trim()
);
if (bad.length) {
  console.error(`\n${bad.length} invalid row(s), nothing imported:`);
  for (const b of bad.slice(0, 5)) console.error(`  line ${b.line}: ${JSON.stringify(b)}`);
  process.exit(1);
}

const env = { ...loadEnv(), ...process.env };
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
const host = (cs?.match(/@([^/:]+)/) || [, 'unknown'])[1];
const pool = new Pool({
  connectionString: cs,
  ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
});

const { rows: existing } = await pool.query(
  `select source_text from prompts where mode = 'translate' and source_text is not null`
);
const seen = new Set(existing.map((r) => r.source_text));
const fresh = rows.filter((r) => !seen.has(r.source_text));

console.log(`\n  database : ${host}`);
console.log(`  file     : ${rows.length} rows`);
console.log(`  already  : ${rows.length - fresh.length} present, skipping`);
console.log(`  to load  : ${fresh.length} as INACTIVE reserve`);

const bySector = {};
for (const r of fresh) bySector[r.sector] = (bySector[r.sector] ?? 0) + 1;
console.log('  spread   :', Object.entries(bySector).map(([s, n]) => `${s} ${n}`).join(', ') || 'none');

if (!COMMIT) {
  console.log('\n  dry run. re-run with --commit to insert.\n');
  await pool.end();
  process.exit(0);
}

let n = 0;
for (const r of fresh) {
  await pool.query(
    `insert into prompts (mode, register, sector, topic, text_so, text_en, source_text, active)
     values ('translate', $1, $2, $3, $4, $5, $6, false)`,
    [r.register, r.sector, r.topic, INSTRUCTION_SO, INSTRUCTION_EN, r.source_text]
  );
  n++;
}

console.log(`\n  imported ${n} inactive translate prompts.`);
console.log('  they are not visible yet. release them with scripts/release-prompts.mjs\n');
await pool.end();
