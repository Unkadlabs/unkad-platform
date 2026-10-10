// Event registration counts, per event. Read-only, aggregates only: no names,
// addresses or questions are ever printed.
//
//   node scripts/event-registrations.mjs
//
// Reads DATABASE_URL from the environment, else from .env.local.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const f = process.env.THANKS_ENV || path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const env = { ...loadEnv(), ...process.env };
const cs = env.DATABASE_URL;
if (!cs) {
  console.error('no DATABASE_URL');
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

const { rows } = await pool.query(`
  select event_slug,
         count(*)::int                                          as registered,
         count(confirmed_at)::int                               as confirmed,
         count(unsubscribed_at)::int                            as unsubscribed,
         count(reminded_day_at)::int                            as reminded_day,
         count(reminded_hour_at)::int                           as reminded_hour,
         count(*) filter (where question is not null)::int      as with_question,
         count(*) filter (where lang = 'so')::int               as lang_so,
         count(*) filter (where lang = 'en')::int               as lang_en,
         count(*) filter (where created_at > now() - interval '24 hours')::int as last_24h
    from event_registrations
   group by event_slug
   order by event_slug`);

console.log(`\n  event registrations · db ${local ? 'local' : 'REMOTE'} · ${new Date().toISOString()}\n`);
if (!rows.length) console.log('  none yet');
for (const r of rows) {
  console.log(`  ${r.event_slug}`);
  console.log(`    registered     ${r.registered}   (last 24h: ${r.last_24h})`);
  console.log(`    confirmed      ${r.confirmed}`);
  console.log(`    unsubscribed   ${r.unsubscribed}`);
  console.log(`    reminded       day ${r.reminded_day} · hour ${r.reminded_hour}`);
  console.log(`    with question  ${r.with_question}`);
  console.log(`    by lang        so ${r.lang_so} · en ${r.lang_en}`);
}
console.log('');

await pool.end();
