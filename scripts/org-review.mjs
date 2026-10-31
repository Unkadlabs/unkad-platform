// Partner organisation review links (/barayaasha) and their progress.
//
//   node scripts/org-review.mjs new --name "Ururka Barayaasha Afka Hooyo ee Sweden" --short UBAHS
//   node scripts/org-review.mjs list
//
// Add --prod to reach the live database; without it the script stays local,
// because minting a real link is not something to do by accident.
//
// The token is 32 random bytes, printed once here and never logged. Whoever
// holds the link can review as that organisation, so send it to the
// organisation's contact directly. `list` prints counts only, never text.

import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

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
const args = process.argv.slice(2);
const cmd = args[0];
const get = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };

const prod = args.includes('--prod');
const cs = prod ? (env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING) : env.DATABASE_URL;
if (!cs) { console.error(prod ? 'No DATABASE_URL_UNPOOLED found.' : 'No DATABASE_URL found.'); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });
const base = prod ? 'https://qor.unkad.com' : 'http://localhost:3000';

try {
  if (cmd === 'new') {
    const name = get('name'), short = get('short');
    if (!name || !short) throw new Error('need --name and --short');
    const token = randomBytes(32).toString('base64url');
    await pool.query('insert into review_orgs (name, short_name, token) values ($1, $2, $3)', [name, short, token]);
    console.log(`${short}: ${base}/barayaasha/${token}`);
  } else if (cmd === 'list') {
    const { rows } = await pool.query(`
      select o.short_name, o.active,
             count(r.id)::int total,
             count(*) filter (where r.verdict = 'approve')::int approve,
             count(*) filter (where r.verdict = 'edit')::int edit,
             count(*) filter (where r.verdict = 'reject')::int reject,
             count(distinct r.reviewer_name)::int reviewers,
             max(r.created_at) last
      from review_orgs o left join org_reviews r on r.org_id = o.id
      group by o.id order by o.created_at`);
    console.table(rows);
  } else {
    console.log('usage: node scripts/org-review.mjs new --name "..." --short X [--prod] | list [--prod]');
  }
} finally {
  await pool.end();
}
