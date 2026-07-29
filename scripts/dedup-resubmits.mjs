// Remove resubmit duplicates for one contributor, in two passes.
//
// Background: before the server-side guard existed, a slow phone connection
// could post the same form many times. Each post succeeded silently, so one
// contributor's page carried the same sentence thirteen times. Those copies
// were rejected but never removed, and a rejected row still renders as a card
// a reviewer must scroll past, which is what made verification feel like
// drowning in duplicates.
//
// Pass 1 — live twins. Identical text is one contribution however many prompt
// ids it landed under. Keep the best copy (verified > accepted > oldest) and
// reject the rest. The earlier cleanup partitioned by prompt id and therefore
// missed twins that crossed prompts.
//
// Pass 2 — rejected debris. Delete rejected rows whose exact text still exists
// in a live row. Those are resubmit artefacts, not judgements: the text itself
// survives untouched in the row that was kept. Rejections with no live twin
// were real decisions about real text and are left alone.
//
//   node scripts/dedup-resubmits.mjs <userId>            # dry run
//   node scripts/dedup-resubmits.mjs <userId> --commit   # apply
//
// Reads .env.local by default; point THANKS_ENV at another env file for
// production.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const UID = process.argv.find((a) => /^[0-9a-f-]{36}$/i.test(a));
const COMMIT = process.argv.includes('--commit');
if (!UID) {
  console.error('usage: node scripts/dedup-resubmits.mjs <userId> [--commit]');
  process.exit(1);
}

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
const pool = new Pool({
  connectionString: cs,
  ssl: local ? undefined : { rejectUnauthorized: false },
});

const [{ handle } = {}] = (
  await pool.query('select handle from users where id = $1', [UID])
).rows;
if (!handle) {
  console.error('no such user');
  process.exit(1);
}

const { rows: twins } = await pool.query(
  `with ranked as (
     select id, text_so, status::text st, row_number() over (
       partition by text_so
       order by (verified_by is not null) desc, (status = 'accepted') desc, created_at asc
     ) rn
     from submissions
     where user_id = $1 and status != 'rejected'
   )
   select id, left(text_so, 45) t, st from ranked where rn > 1`,
  [UID]
);

const { rows: debris } = await pool.query(
  `select r.id, left(r.text_so, 45) t
     from submissions r
    where r.user_id = $1
      and r.status = 'rejected'
      and exists (
        select 1 from submissions k
         where k.user_id = $1 and k.status != 'rejected'
           and k.text_so = r.text_so and k.id != r.id)`,
  [UID]
);

console.log(`\n  ${handle}`);
console.log(`  live twins to reject:      ${twins.length}`);
twins.forEach((r) => console.log(`    [${r.st}] ${r.t}`));
console.log(`  rejected debris to delete: ${debris.length}`);

if (!COMMIT) {
  console.log('\n  dry run. add --commit to apply.\n');
  await pool.end();
  process.exit(0);
}

if (twins.length) {
  await pool.query(
    `update submissions set status = 'rejected', verified_at = null, verified_by = null,
       updated_at = now() where id = any($1)`,
    [twins.map((r) => r.id)]
  );
}
if (debris.length) {
  await pool.query('delete from submissions where id = any($1)', [debris.map((r) => r.id)]);
}

const [{ id: adminId } = {}] = (
  await pool.query("select id from users where role = 'admin' order by created_at limit 1")
).rows;
await pool.query(
  `insert into audit_log (actor_id, action, entity_type, entity_id, meta)
   values ($1, 'admin.dedup_resubmits', 'user', $2, $3)`,
  [
    adminId ?? null,
    UID,
    JSON.stringify({
      rejected_twins: twins.length,
      deleted_debris: debris.length,
      reason:
        'cross-prompt identical resubmits: best copy kept per distinct text, resubmit debris removed; text preserved in the kept row',
    }),
  ]
);

const [after] = (
  await pool.query(
    `select count(*) filter (where status != 'rejected') live,
            count(*) filter (where status = 'rejected') rejected
       from submissions where user_id = $1`,
    [UID]
  )
).rows;
console.log(`\n  done. page now shows ${after.live} live and ${after.rejected} rejected cards.\n`);
await pool.end();
