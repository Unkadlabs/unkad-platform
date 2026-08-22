// Mint an invite link for someone writing instruction pairs by hand.
//
//   npm run seed:list                       # who has written what, live
//   npm run seed:new -- --sectors law,religion --label "person 4"
//
// Add --prod to reach the live database; without it the script stays local,
// because minting a real link is not something to do by accident.
//   THANKS_ENV=/path/to/.env.prod node scripts/seed-invite.mjs --name "..."
//
// The token is 32 random bytes. It is printed once, here, and never written to
// a log or an audit record: whoever holds the link holds the access, so it
// should be sent directly to the person and nowhere else.

import { Pool } from 'pg';
import { randomBytes } from 'crypto';
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
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

// --prod talks to the live Neon database. Without it the script stays on the
// local one, because minting a real link is not something to do by accident.
const prod = args.includes('--prod');
let cs = prod
  ? (env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING)
  : env.DATABASE_URL;
if (!cs) { console.error(prod ? 'No DATABASE_URL_UNPOOLED found.' : 'No DATABASE_URL found.'); process.exit(1); }

// TLS is configured below, so the sslmode in the string is redundant and only
// earns a deprecation warning on every run.
cs = cs.replace(/[?&]sslmode=[^&]*/g, (m) => (m[0] === '?' ? '?' : '')).replace(/\?$/, '');
const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });
const base = get('base', local ? 'http://localhost:3000' : 'https://qor.unkad.com');
if (prod) console.log('\n  (live database)');

if (args.includes('--links')) {
  const { rows } = await pool.query(
    'select token, name, credit_name, sectors, consent_at from seed_invites where active order by created_at'
  );
  for (const r of rows) {
    const who = r.credit_name || r.name || '(unclaimed)';
    console.log(`\n  ${who} · ${r.sectors}${r.consent_at ? '' : ' · not opened yet'}`);
    console.log(`  ${base}/seed/${r.token}`);
  }
  console.log('');
  await pool.end();
  process.exit(0);
}

if (args.includes('--list')) {
  const { rows } = await pool.query(`
    select i.name, i.credit_name, i.sectors, i.per_sector, i.consent_at, i.active,
           i.last_seen_at, count(s.id)::int as written
    from seed_invites i left join seed_items s on s.invite_id = i.id
    group by i.id order by i.created_at desc`);
  if (!rows.length) console.log('No invites yet.');
  for (const r of rows) {
    const target = r.sectors.split(',').length * r.per_sector;
    const who = (r.credit_name || r.name || '(unclaimed)').slice(0, 16);
    console.log(
      `${who.padEnd(16)} ${String(r.written).padStart(4)}/${target}  ${r.sectors}` +
      `  ${r.consent_at ? 'agreed' : 'not opened yet'}${r.active ? '' : '  REVOKED'}` +
      `${r.last_seen_at ? '  last wrote ' + r.last_seen_at.toISOString().slice(0, 16).replace('T', ' ') : ''}`
    );
  }
  await pool.end();
  process.exit(0);
}

// No name required. The person types their own on the consent screen, so a
// link can be cut and handed on before anyone knows who will take it. --label
// is only for your own tracking in --list.
const label = get('label') || get('name') || null;
const sectors = get('sectors', 'culture,media');
const perSector = parseInt(get('per', '43'), 10);

const token = randomBytes(32).toString('base64url');
await pool.query(
  'insert into seed_invites (token, name, sectors, per_sector) values ($1,$2,$3,$4)',
  [token, label, sectors, perSector]
);

const target = sectors.split(',').length * perSector;
console.log(`\n  ${label ? label + ' · ' : ''}${sectors} · ${perSector} each · ${target} total\n`);
console.log(`  ${base}/seed/${token}\n`);
console.log('  Send this link to them directly. It is the only credential, and');
console.log('  anyone holding it can write as that person. Reprint any time with');
console.log('  npm run seed:links.\n');

await pool.end();
