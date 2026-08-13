// The weekly goal digest: follow-up about YOUR goal, never a blast.
//
// This is the replacement for generic daily mail. A person receives it
// only if all of these hold:
//   - they set a goal themselves and ticked "email me about my goal"
//   - they have not received a digest in the last 7 days
//   - they are not opted out and have never hard-bounced
//
// The content is computed per person from the same tables the home
// page reads: their goal, what they did this week, days missed, and
// their slice of what remains of the 100,000. Someone who hit their
// goal gets congratulated; someone who missed gets one gentle line,
// not a guilt trip.
//
// Same safety posture as nudge.mjs, same reasons:
//   dry run by default; --send to send
//   UNKAD_BULK_TOKEN, never the password-reset key
//   GOAL_DIGEST_CAP per run, under the provider allowance
//   List-Unsubscribe headers, token minted on first use
//
// SOMALI REVIEW LOCK: the Somali strings below are drafts and have not
// been reviewed by the founder. --send refuses to run until
// GOAL_COPY_APPROVED=1 is set, which should only happen after review.
//
//   node scripts/goal-digest.mjs           # dry run
//   GOAL_COPY_APPROVED=1 node scripts/goal-digest.mjs --send

import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SEND = process.argv.includes('--send');
const CAP = Number(process.env.GOAL_DIGEST_CAP ?? 40);
const BASE = process.env.NUDGE_BASE_URL ?? 'https://qor.unkad.com';

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

const KEY = env.UNKAD_BULK_TOKEN;
const FROM = env.EMAIL_FROM_BULK ?? 'Unkad <no-reply@unkad.com>';

const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

// Everyone due a digest, with this week's numbers computed in one query.
const { rows } = await pool.query(
  `select u.id, u.handle, u.email,
          g.weekly_write, g.weekly_validate,
          (select count(*) from submissions s
            where s.user_id = u.id and s.created_at > now() - interval '7 days') wrote,
          (select count(*) from validations v
            where v.user_id = u.id and v.created_at > now() - interval '7 days') validated
     from goals g
     join users u on u.id = g.user_id
    where g.notify = true
      and (g.weekly_write > 0 or g.weekly_validate > 0)
      and (g.last_digest_at is null or g.last_digest_at < now() - interval '7 days')
      -- The first digest is the 7-day check of a fresh goal, not a
      -- same-day echo of setting it.
      and g.created_at < now() - interval '6 days'
      and u.deleted_at is null
      and u.email is not null
      and u.email_opt_out_at is null
      and u.email_bounced_at is null
    order by g.created_at asc
    limit $1`,
  [CAP]
);

const { rows: [corpus] } = await pool.query(
  `select count(*) n from submissions where status = 'accepted'`
);

// !! VERIFY SOMALI — DRAFT, founder review required before any send !!
// Numbers are injected; the sentences must survive his review verbatim.
function bodySo(r, unsub) {
  const wroteLine =
    r.weekly_write > 0 ? `Qoraal: ${r.wrote} / ${r.weekly_write} jumlado toddobaadkan.` : '';
  const valLine =
    r.weekly_validate > 0 ? `Hubin: ${r.validated} / ${r.weekly_validate} toddobaadkan.` : '';
  const hit = r.wrote >= r.weekly_write && r.validated >= r.weekly_validate;
  const closer = hit
    ? 'Waad gaartay yoolkaagii toddobaadkan. Mahadsanid!'
    : 'Yoolkaagu weli waa suurtagal. Hal jumlad ayaa ku filan maanta.';
  return `Asalaamu Calaykum ${r.handle},

Waa warbixinta yoolkaaga toddobaadlaha ah.

${wroteLine}
${valLine}

${closer}

${BASE}/home

Unkad Labs

Waad iska joojin kartaa: ${unsub}`;
}

const SHAPE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const good = rows.filter((r) => SHAPE.test(r.email));
const bad = rows.filter((r) => !SHAPE.test(r.email));

console.log(`\n  ${SEND ? 'SENDING' : 'DRY RUN'} · goal digest · ${new Date().toISOString()}`);
console.log(`  due: ${rows.length}  sendable: ${good.length}  skipped: ${bad.length}  cap: ${CAP}\n`);

if (SEND && env.GOAL_COPY_APPROVED !== '1') {
  console.error('  Somali copy not marked approved (GOAL_COPY_APPROVED=1). Refusing to send.');
  process.exit(1);
}

let sent = 0;
for (const r of good) {
  if (!SEND) {
    const hit = r.wrote >= r.weekly_write && r.validated >= r.weekly_validate;
    console.log(
      `  would send  ${r.handle} <${r.email}>  wrote ${r.wrote}/${r.weekly_write}  validated ${r.validated}/${r.weekly_validate}  ${hit ? 'HIT' : 'in progress'}`
    );
    continue;
  }

  if (!KEY) {
    console.error('  UNKAD_BULK_TOKEN not set; refusing to send through the reset key');
    process.exit(1);
  }

  const t = crypto.randomBytes(32).toString('hex');
  const { rows: [u] } = await pool.query(
    `update users set unsub_token = coalesce(unsub_token, $2), updated_at = now()
      where id = $1 returning unsub_token`,
    [r.id, t]
  );
  const unsub = `${BASE}/unsubscribe/${u.unsub_token}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [r.email],
      subject: 'Qor Af-Soomaali · yoolkaaga toddobaadkan',
      text: bodySo(r, unsub),
      headers: {
        'List-Unsubscribe': `<${unsub}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (res.ok) {
    await pool.query(`update goals set last_digest_at = now(), updated_at = now() where user_id = $1`, [r.id]);
    sent++;
    console.log(`  sent  ${r.handle} <${r.email}>`);
  } else {
    console.error(`  FAIL  ${r.email}  ${await res.text().catch(() => '')}`);
  }
}

console.log(`\n  done. sent ${sent}/${good.length}. corpus accepted rows: ${corpus.n}\n`);
await pool.end();
