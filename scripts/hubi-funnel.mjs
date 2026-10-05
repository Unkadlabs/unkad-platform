// The Hubi AI-ga funnel in one compact run: how many visits started, how far
// they got, how many finished, and how often each item was judged correctly.
//
// Read-only. Aggregates only, never row dumps: the events carry no identity,
// but the output should still be safe to paste anywhere.
//
//   THANKS_ENV=/path/to/.env.prod node scripts/hubi-funnel.mjs
//   node scripts/hubi-funnel.mjs            # local database

import { Pool } from 'pg';
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
const local = /localhost|127\.0\.0\.1/.test(cs ?? '');
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

// Deck order, read from the source so item k means the k-th card shown.
let order = [];
try {
  const src = fs.readFileSync(path.join(process.cwd(), 'lib/hubi-ai.ts'), 'utf8');
  const deck = src.slice(src.indexOf('HUBI_ITEMS'), src.indexOf('HUBI_PROFILE'));
  order = [...deck.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1]);
} catch {}
const N = order.length || 6;

const [sessions, depth, runs, items] = await Promise.all([
  pool.query(`select
      count(distinct session) filter (where kind = 'start')  started,
      count(distinct session) filter (where kind = 'finish') finished_ev
    from hubi_ai_events`),
  // distinct items judged per session (a session that started but judged
  // nothing counts as 0)
  pool.query(`select judged, count(*)::int n from (
      select session, count(distinct item_id) filter (where kind = 'answer')::int judged
      from hubi_ai_events group by session) s
    group by judged`),
  pool.query(`select count(*)::int total,
      count(*) filter (where profile->>'use' is null and profile->>'trained' is null and profile->>'fluent' is null)::int skipped,
      count(*) filter (where profile->>'use' is not null and profile->>'trained' is not null and profile->>'fluent' is not null)::int full_survey
    from hubi_ai_runs`),
  // first judgement per session per item, so a double click cannot count twice
  pool.query(`select item_id, count(*)::int n, count(*) filter (where correct)::int ok from (
      select distinct on (session, item_id) session, item_id, correct
      from hubi_ai_events where kind = 'answer'
      order by session, item_id, created_at) a
    group by item_id`),
]);

const s = sessions.rows[0];
const atLeast = (k) => depth.rows.filter((r) => r.judged >= k).reduce((a, r) => a + r.n, 0);
const totalSessions = depth.rows.reduce((a, r) => a + r.n, 0);
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const r = runs.rows[0];

console.log(`Hubi AI-ga funnel (${local ? 'local' : 'remote'} database)`);
console.log(`  sessions started        ${s.started}`);
for (let k = 1; k <= N; k++) {
  // reached item k = it was shown: item 1 on start, item k after k-1 judged
  const reached = k === 1 ? totalSessions : atLeast(k - 1);
  console.log(`  reached item ${k}          ${String(reached).padEnd(5)} judged ${atLeast(k)}`);
}
console.log(`  finished (finish event) ${s.finished_ev}`);
console.log(`  finished runs (all)     ${r.total}   full survey ${r.full_survey}, skipped survey ${r.skipped}`);
console.log(`  start -> finish         ${pct(Number(s.finished_ev), Number(s.started))}`);
console.log('');
console.log('  per item, % judged correctly (first click per session)');
const byId = new Map(items.rows.map((x) => [x.item_id, x]));
const ids = order.length ? [...order, ...[...byId.keys()].filter((i) => !order.includes(i))] : [...byId.keys()].sort();
ids.forEach((id, i) => {
  const x = byId.get(id) ?? { n: 0, ok: 0 };
  console.log(`  ${String(i + 1).padStart(2)}. ${id.padEnd(12)} ${pct(x.ok, x.n).padStart(4)}  (n=${x.n})`);
});

await pool.end();
