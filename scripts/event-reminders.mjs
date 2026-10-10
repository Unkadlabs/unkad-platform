// Event reminders for /kulan registrations.
//
// Two reminders per event, both driven by lib/events.ts (loaded through tsx so
// the event config, the email copy and the unsubscribe signing are the exact
// ones the app uses):
//   day   sent when the event starts within 30 hours, to everyone not yet
//         given it and not unsubscribed
//   hour  sent when the event starts within 2 hours, likewise. Someone who is
//         due both at once (registered late, or the day run was missed) gets
//         only the hour reminder, and the day column is marked too.
// Nothing is sent once an event has started.
//
// Each column is marked only after a successful send, so a rerun picks up
// whatever failed. A cap per run (default 90) keeps a run under the provider's
// 100/day free allowance. This goes through UNKAD_BULK_TOKEN, like nudge.mjs,
// never the password-reset key; note that nudge.mjs spends from the same bulk
// allowance on the same day.
//
// Dry run unless --send is passed. Addresses are printed masked.
//
//   node scripts/event-reminders.mjs                              # dry run
//   node scripts/event-reminders.mjs --send                       # actually send
//   node scripts/event-reminders.mjs --now=2026-10-14T15:30:00Z   # simulate a time (dry run)
//   node scripts/event-reminders.mjs --cap=50 --event=<slug>
//
// Env: DATABASE_URL (from .env.local unless set), UNKAD_BULK_TOKEN,
// EVENT_TOKEN_SECRET (required to --send against a non-local database),
// EMAIL_FROM_BULK, EVENT_BASE_URL (default https://qor.unkad.com).

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { tsImport } from 'tsx/esm/api';

const { EVENTS, reminderEmail, unsubscribeUrl, SITE_BASE } = await tsImport(
  '../lib/events.ts',
  import.meta.url
);

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const SEND = process.argv.includes('--send');
const NOW_ARG = arg('now');
if (SEND && NOW_ARG) {
  console.error('--now is for dry runs only');
  process.exit(1);
}
const NOW = NOW_ARG ? new Date(NOW_ARG) : new Date();
if (Number.isNaN(NOW.getTime())) {
  console.error(`bad --now: ${NOW_ARG}`);
  process.exit(1);
}
const ONLY = arg('event');

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
const CAP = Number(arg('cap') ?? env.EVENT_REMINDER_CAP ?? 90);
const BASE = env.EVENT_BASE_URL ?? SITE_BASE;
const cs = env.DATABASE_URL;
if (!cs) {
  console.error('no DATABASE_URL');
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(cs);

const KEY = env.UNKAD_BULK_TOKEN;
const FROM = env.EMAIL_FROM_BULK ?? 'Unkad <no-reply@unkad.com>';

// Must match the app's secret or the unsubscribe links will not verify. The
// dev fallback mirrors `next dev` and is only allowed against a local database.
const SECRET = env.EVENT_TOKEN_SECRET || (local ? 'dev-only-event-token-secret' : null);
if (SEND && !SECRET) {
  console.error('EVENT_TOKEN_SECRET not set; refusing to send links that cannot unsubscribe');
  process.exit(1);
}
if (SEND && !KEY) {
  console.error('UNKAD_BULK_TOKEN not set; refusing to send through the reset key');
  process.exit(1);
}

const pool = new Pool({
  connectionString: cs,
  ssl: local ? undefined : { rejectUnauthorized: false },
  keepAlive: true,
  idleTimeoutMillis: 0,
});
pool.on('error', (err) => console.error(`  pool error (recovering): ${err.message}`));

async function q(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error(`  query retry after: ${err.message}`);
    return await pool.query(text, params);
  }
}

const mask = (email) => {
  const [u, d] = email.split('@');
  return `${u.slice(0, 1)}***@${d}`;
};

const HOUR = 3600 * 1000;

console.log(`\n  ${SEND ? 'SENDING' : 'DRY RUN'} · now ${NOW.toISOString()} · db ${local ? 'local' : 'REMOTE'}`);
console.log(`  cap ${CAP}/run\n`);

let budget = CAP;
let sent = 0;
let failed = 0;
let wouldSend = 0;
let overCap = 0;

for (const ev of EVENTS) {
  if (ONLY && ev.slug !== ONLY) continue;
  const toStart = new Date(ev.start).getTime() - NOW.getTime();
  let kind = null;
  if (toStart <= 0) kind = null;
  else if (toStart <= 2 * HOUR) kind = 'hour';
  else if (toStart <= 30 * HOUR) kind = 'day';

  const hrs = (toStart / HOUR).toFixed(1);
  if (!kind) {
    console.log(`  ${ev.slug}: starts in ${hrs}h, no reminder window open`);
    continue;
  }

  const col = kind === 'day' ? 'reminded_day_at' : 'reminded_hour_at';
  const { rows } = await q(
    `select id, name, email, lang from event_registrations
      where event_slug = $1 and unsubscribed_at is null and ${col} is null
      order by created_at asc`,
    [ev.slug]
  );
  console.log(`  ${ev.slug}: starts in ${hrs}h, '${kind}' reminder due for ${rows.length}`);

  for (const r of rows) {
    if (budget <= 0) {
      overCap++;
      continue;
    }
    budget--;
    const lang = r.lang === 'en' ? 'en' : 'so';
    const unsub = SECRET ? unsubscribeUrl(BASE, r.id, SECRET) : `${BASE}/kulan/ka-bax?t=<needs-secret>`;
    const mail = reminderEmail(ev, lang, kind, { name: r.name, unsubUrl: unsub });

    if (!SEND) {
      wouldSend++;
      console.log(`    would send [${kind}/${lang}] ${mask(r.email)}  "${mail.subject}"`);
      continue;
    }

    const post = () =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [r.email],
          subject: mail.subject,
          text: mail.text,
          headers: { 'List-Unsubscribe': `<${unsub}>` },
        }),
        signal: AbortSignal.timeout(10000),
      });

    let res;
    try {
      res = await post();
    } catch (err) {
      await new Promise((s) => setTimeout(s, 2000));
      try {
        res = await post();
      } catch (err2) {
        failed++;
        console.error(`    SKIP ${mask(r.email)} network: ${err2.message}`);
        continue;
      }
    }

    if (res.ok) {
      // The hour reminder also closes out the day one, so a late run never
      // sends a stale "day before" after the "starting soon".
      await q(
        kind === 'hour'
          ? `update event_registrations set reminded_hour_at = now(),
               reminded_day_at = coalesce(reminded_day_at, now()) where id = $1`
          : `update event_registrations set reminded_day_at = now() where id = $1`,
        [r.id]
      );
      sent++;
      console.log(`    sent [${kind}/${lang}] ${mask(r.email)}`);
    } else {
      const detail = await res.text().catch(() => '');
      failed++;
      console.error(`    FAIL ${mask(r.email)} ${res.status} ${detail.slice(0, 160)}`);
    }
    await new Promise((s) => setTimeout(s, 400));
  }
}

if (SEND) console.log(`\n  sent ${sent}, failed ${failed}, held back by cap ${overCap}\n`);
else console.log(`\n  would send ${wouldSend}, held back by cap ${overCap}. nothing sent; add --send to mail.\n`);

await pool.end();
