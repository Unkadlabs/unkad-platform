// Who contributed in the last N hours, and which of them consented to be named.
//
// Emits JSON on stdout for the acknowledgements poster in the site repo
// (../dhiblabs/scripts/make-poster-thanks.mjs). The consent filtering lives
// here, next to the schema that records it, rather than in the drawing code:
// whoever changes `credit_choice` should not have to remember that a poster
// script in another repository also depends on it.
//
//   node scripts/thanks-data.mjs            # last 24 hours
//   node scripts/thanks-data.mjs --hours 48
//
// Validation counts as contribution. The people working the review queue are
// doing the job that decides whether any of this becomes a dataset, and
// leaving them off a thank-you would say the opposite.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const hIdx = process.argv.indexOf('--hours');
const HOURS = hIdx > -1 ? Number(process.argv[hIdx + 1]) : 24;

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
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
const host = (cs?.match(/@([^/:]+)/) || [, 'unknown'])[1];
const pool = new Pool({
  connectionString: cs,
  ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
});

const { rows } = await pool.query(
  `select u.handle, u.credit_choice::text cc, u.credit_name,
     (select count(*) from submissions s
        where s.user_id = u.id and s.created_at > now() - ($1 || ' hours')::interval)::int subs,
     (select count(*) from validations v
        where v.user_id = u.id and v.created_at > now() - ($1 || ' hours')::interval)::int vals
   from users u where u.deleted_at is null`,
  [String(HOURS)]
);
await pool.end();

const active = rows.filter((r) => r.subs > 0 || r.vals > 0);

// Only these two choices are permission to print a name. 'anonymous' is an
// explicit no; an unset choice is not a yes. Both are counted, never named.
const canName = (r) => r.cc === 'handle' || r.cc === 'real_name';
const nameOf = (r) => (r.cc === 'real_name' ? r.credit_name || r.handle : r.handle).trim();

const named = active.filter(canName).map(nameOf).filter(Boolean);

// Per-person counts, for layouts that size a shape by contribution. Withheld
// contributors keep their weight and lose their name: they are still on the
// picture, just not identified.
const people = active.map((r) => ({
  name: canName(r) && nameOf(r) ? nameOf(r) : null,
  subs: r.subs,
  vals: r.vals,
}));

process.stdout.write(
  JSON.stringify(
    {
      hours: HOURS,
      active: active.length,
      named,
      withheld: active.length - named.length,
      people,
    },
    null,
    2
  ) + '\n'
);

// stderr so it never contaminates the JSON on stdout.
console.error(
  `[${host}] ${HOURS}h: ${active.length} active, ${named.length} nameable, ` +
  `${active.length - named.length} withheld by choice`
);
