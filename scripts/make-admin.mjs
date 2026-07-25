// Promote an account to admin, and optionally set its password.
//
// There was no way to bootstrap a production admin: scripts/seed.ts creates
// admin@unkad.com but is dev-only, and every in-app promotion path requires an
// existing admin. This is the chicken-and-egg fix.
//
// Passwords are bcrypt hashed at cost 12 and cannot be read back, so a
// forgotten password can only be replaced, never recovered.
//
//   node scripts/make-admin.mjs you@example.com                 # promote only
//   node scripts/make-admin.mjs you@example.com 'new-password'  # promote + set password
//
// Targets whichever database DATABASE_URL points at, falling back to
// POSTGRES_URL. It prints the host and waits, because those two are usually
// local and production respectively, and picking the wrong one silently is the
// mistake worth guarding against.

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const [email, newPassword] = process.argv.slice(2);

if (!email) {
  console.error('usage: node scripts/make-admin.mjs <email> [new-password]');
  process.exit(1);
}

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const env = { ...loadEnv(), ...process.env };
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
if (!cs) {
  console.error('no DATABASE_URL or POSTGRES_URL found');
  process.exit(1);
}

const host = (cs.match(/@([^/:]+)/) || [, 'unknown'])[1];
const isProd = !/localhost|127\.0\.0\.1/.test(host);

console.log(`\n  database : ${host}`);
console.log(`  target   : ${email}`);
console.log(`  action   : promote to admin${newPassword ? ' + set new password' : ''}`);
console.log(`  scope    : ${isProd ? 'PRODUCTION — real contributors' : 'local development'}\n`);

async function confirm() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question('  type yes to proceed: ', res));
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

if (isProd && !(await confirm())) {
  console.log('  aborted, nothing changed');
  process.exit(0);
}

const pool = new Pool({
  connectionString: cs,
  ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
});

const { rows: found } = await pool.query(
  'select id, role from users where email = $1 and deleted_at is null',
  [email]
);

if (!found.length) {
  console.error(`\n  no active account with that email. Sign up at the site first, then re-run.`);
  await pool.end();
  process.exit(1);
}

const sets = ["role = 'admin'"];
const params = [email];
if (newPassword) {
  if (newPassword.length < 10) {
    console.error('\n  password must be at least 10 characters');
    await pool.end();
    process.exit(1);
  }
  params.push(await bcrypt.hash(newPassword, 12));
  sets.push(`password_hash = $${params.length}`);
}

await pool.query(`update users set ${sets.join(', ')} where email = $1`, params);

// The audit log is append-only and every other privileged action writes to it;
// a role change made from a shell should not be the one that goes unrecorded.
await pool.query(
  `insert into audit_log (actor_id, action, entity_type, entity_id, meta)
   values ($1, $2, 'user', $1, $3)`,
  [
    found[0].id,
    'user.role_changed',
    JSON.stringify({ from: found[0].role, to: 'admin', via: 'scripts/make-admin.mjs' }),
  ]
).catch((e) => console.log(`  (audit log entry skipped: ${e.message})`));

console.log(`\n  done. ${email} is now admin${newPassword ? ' with the new password' : ''}.`);
console.log(`  log in at ${isProd ? 'https://qor.unkad.com/login' : 'http://localhost:3000/login'}\n`);

await pool.end();
