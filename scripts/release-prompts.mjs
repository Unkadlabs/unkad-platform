// Activate a batch of reserve prompts each day, choosing the sectors the
// corpus is thinnest in.
//
// This is the one lever that steers what contributors write. On launch night
// 80% of submitted characters landed in `general` while law, agriculture and
// health had almost nothing, because that is roughly what the active prompts
// offered. Releasing by gap rather than at random fills the coverage matrix
// without asking anyone to do anything differently.
//
//   node scripts/release-prompts.mjs               # dry run
//   node scripts/release-prompts.mjs --commit      # activate
//   node scripts/release-prompts.mjs --commit -n 20
//
// Intended to run daily. Reserve stock is finite, so it warns loudly when the
// bank is running low: you want to know before contributors hit an empty queue,
// not after.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const COMMIT = process.argv.includes('--commit');
const nIdx = process.argv.indexOf('-n');
const BATCH = nIdx > -1 ? Number(process.argv[nIdx + 1]) : 12;
const LOW_STOCK = 30;

function loadEnv() {
  const f = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs.readFileSync(f, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
  );
}

const env = { ...loadEnv(), ...process.env };
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
const host = (cs?.match(/@([^/:]+)/) || [, 'unknown'])[1];
const pool = new Pool({
  connectionString: cs,
  ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
});
const q = async (s, p) => (await pool.query(s, p)).rows;

// Corpus coverage: characters collected per sector so far. Sectors with the
// least material are the ones worth prompting for.
const coverage = await q(
  `select sector::text as sector, coalesce(sum(char_count), 0)::int as chars
   from submissions group by sector`
);
const chars = Object.fromEntries(coverage.map((r) => [r.sector, r.chars]));

const reserve = await q(
  `select id, mode, sector::text as sector, topic
   from prompts where active = false order by created_at`
);

if (!reserve.length) {
  console.log('\n  reserve is empty. Nothing to release.');
  console.log('  Load more with scripts/import-translate-prompts.mjs, or write');
  console.log('  Somali write-prompts and import those.\n');
  await pool.end();
  process.exit(0);
}

// Rank each reserve prompt by how starved its sector is. Ties fall back to
// insertion order so the oldest reserve drains first.
const ranked = [...reserve].sort((a, b) => (chars[a.sector] ?? 0) - (chars[b.sector] ?? 0));
const chosen = ranked.slice(0, BATCH);

console.log(`\n  database : ${host}`);
console.log(`  reserve  : ${reserve.length} inactive prompts`);
console.log(`  releasing: ${chosen.length}\n`);

const counts = {};
for (const c of chosen) counts[c.sector] = (counts[c.sector] ?? 0) + 1;
for (const [sector, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${sector.padEnd(12)} ${String(n).padStart(3)}   (corpus has ${chars[sector] ?? 0} chars)`);
}

if (!COMMIT) {
  console.log('\n  dry run. re-run with --commit to activate.\n');
  await pool.end();
  process.exit(0);
}

await pool.query(`update prompts set active = true where id = any($1)`, [chosen.map((c) => c.id)]);

await pool.query(
  `insert into audit_log (actor_id, action, entity_type, meta)
   values (null, 'prompts.released', 'prompt', $1)`,
  [JSON.stringify({ count: chosen.length, by_sector: counts, via: 'scripts/release-prompts.mjs' })]
).catch((e) => console.log(`  (audit entry skipped: ${e.message})`));

const remaining = reserve.length - chosen.length;
console.log(`\n  released ${chosen.length}. reserve now ${remaining}.`);
if (remaining < LOW_STOCK) {
  console.log(`\n  WARNING: reserve below ${LOW_STOCK}. Top it up before it runs out,`);
  console.log('  or contributors will start hitting an empty task queue.');
}
console.log('');
await pool.end();
