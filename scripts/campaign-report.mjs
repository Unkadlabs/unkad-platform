// What each campaign actually produced.
//
// Visitor-mode starts carry a source slug when they arrive from a
// campaign QR (school posters use ?src=school-<name>). The slug lives
// in the audit log against the start event, never on the person or
// their sentences, so this reports campaign yield without labelling
// anybody's contribution.
//
// This is the number the budget model's school economics rests on:
// cost per raw sentence = session cost / sentences produced. Run it
// after every session and the claim stays honest.
//
//   node scripts/campaign-report.mjs
//   THANKS_ENV=/path/to/.env.prod node scripts/campaign-report.mjs

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
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING;
if (!cs) {
  console.error('no DATABASE_URL');
  process.exit(1);
}

const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

const { rows } = await pool.query(`
  with starts as (
    select actor_id as user_id,
           coalesce(meta->>'source', '(direct)') as source,
           created_at as started_at
      from audit_log
     where action = 'user.guest_started'
  )
  select s.source,
         count(distinct s.user_id)                                    as visitors,
         count(sub.id)                                                as submissions,
         count(sub.id) filter (where sub.status = 'accepted')         as accepted,
         count(sub.id) filter (where sub.status = 'pending')          as pending,
         to_char(min(s.started_at), 'YYYY-MM-DD')                      as first_seen,
         to_char(max(s.started_at), 'YYYY-MM-DD')                      as last_seen
    from starts s
    left join submissions sub on sub.user_id = s.user_id
   group by s.source
   order by visitors desc
`);

const { rows: [totals] } = await pool.query(`
  select count(*) filter (where is_guest) as guests,
         (select count(*) from goals) as goals
    from users where deleted_at is null
`);

console.log(`\n  CAMPAIGN YIELD · ${new Date().toISOString().slice(0, 10)}\n`);

if (rows.length === 0) {
  console.log('  no visitor-mode starts recorded yet\n');
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  console.log(
    `  ${pad('source', 22)}${num('visitors', 9)}${num('written', 9)}${num('accepted', 9)}${num('pending', 9)}   dates`
  );
  console.log(`  ${'-'.repeat(70)}`);
  for (const r of rows) {
    console.log(
      `  ${pad(r.source, 22)}${num(r.visitors, 9)}${num(r.submissions, 9)}${num(r.accepted, 9)}${num(r.pending, 9)}   ${r.first_seen ?? ''}${r.last_seen && r.last_seen !== r.first_seen ? ' to ' + r.last_seen : ''}`
    );
  }
  console.log();
  // The economics line, computed only where a session cost is known.
  const cost = Number(env.SESSION_COST ?? 0);
  if (cost > 0) {
    const schools = rows.filter((r) => r.source.startsWith('school-'));
    const sentences = schools.reduce((a, r) => a + Number(r.submissions), 0);
    const sessions = Number(env.SESSION_COUNT ?? schools.length);
    if (sentences > 0 && sessions > 0) {
      console.log(
        `  school economics: ${sessions} session(s) x $${cost} = $${sessions * cost} for ${sentences} submissions ` +
          `= $${((sessions * cost) / sentences).toFixed(3)} per raw submission\n`
      );
    }
  }
}

console.log(`  platform totals: ${totals.guests} guest accounts, ${totals.goals} goals set\n`);
await pool.end();
