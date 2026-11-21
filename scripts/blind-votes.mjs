// Blind essay vote (/qiimee): progress and export.
//
//   node scripts/blind-votes.mjs                 # local DB: counts only
//   node scripts/blind-votes.mjs --prod          # production: counts only (read-only)
//   node scripts/blind-votes.mjs --prod --out f  # also write every vote to f (JSON)
//
// Counts never show which essay won anything: until the pre-registered close
// (Thu 26 Nov 2026, 23:59 EAT) only volume is reported. The export carries the
// letters voters picked, the hashed voter key, tags and timing; it is the input
// to the unblinding in the research repo (unkad-qor-context), which alone holds
// the key. No user ids or names are exported.

import fs from 'fs';
import path from 'path';
import pg from 'pg';

const args = process.argv.slice(2);
const prod = args.includes('--prod');
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : null;

function env() {
  const f = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs.readFileSync(f, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
  );
}
const e = env();
const url = prod ? e.DATABASE_URL_UNPOOLED : process.env.DATABASE_URL || e.DATABASE_URL;
const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query('BEGIN TRANSACTION READ ONLY');

const [t] = (await c.query(`
  select count(*)::int votes, count(distinct voter_key)::int voters,
         count(*) filter (where is_contributor)::int contributor_votes,
         count(*) filter (where native = 'yes')::int native_yes,
         count(*) filter (where native = 'no')::int native_no,
         count(*) filter (where ms_on_set < 30000)::int under_30s,
         min(created_at) first, max(created_at) last
  from blind_votes`)).rows;
const per = (await c.query(`select set_id, count(*)::int n from blind_votes group by set_id order by set_id`)).rows;
console.log(`${prod ? 'PRODUCTION' : 'local'} · votes ${t.votes} · voters ${t.voters} · contributor votes ${t.contributor_votes}`);
console.log(`mother tongue yes ${t.native_yes} / no ${t.native_no} · under 30 s ${t.under_30s}`);
console.log(`first ${t.first?.toISOString?.() ?? '-'} · last ${t.last?.toISOString?.() ?? '-'}`);
const ns = per.map((r) => r.n);
console.log(`sets with votes ${per.length}/40 · fewest ${ns.length ? Math.min(...ns) : 0} · most ${ns.length ? Math.max(...ns) : 0}`);

if (out) {
  const rows = (await c.query(`
    select set_id, best, worst, display_order, voter_key, is_contributor, native, ms_on_set, lang, created_at
    from blind_votes order by created_at`)).rows;
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  console.log(`wrote ${rows.length} votes to ${out}`);
}
await c.query('ROLLBACK');
await c.end();
