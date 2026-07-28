// The daily encouragement run.
//
// Runs every morning, picks whoever is genuinely due, and asks them to write
// one sentence and to keep their address current so they hear what the corpus
// does with their work.
//
// The routine is daily. What an individual receives is not, and that gap is the
// whole design. 35 of the 38 dormant accounts are Gmail, and mailing the same
// non-responder every morning is the fastest way to have `unkad.com` classified
// as spam. Reputation is per-domain, so the first thing lost is not this mail,
// it is password resets, which is the one message a locked-out contributor
// actually needs. Set NUDGE_MIN_DAYS=1 for true per-person daily if you want
// it; the default of 3 exists because the domain has one reputation and no
// backup.
//
// Everything below is a brake on that same risk:
//   opted out          never mailed again, no exceptions
//   hard bounced       never retried; repeatedly mailing a dead address is
//                      what convinces a provider the sender is careless
//   NUDGE_MAX_TIMES    someone who has ignored four asks has answered
//   NUDGE_MIN_DAYS     minimum quiet period per person
//   NUDGE_DAILY_CAP    ceiling per run, kept under the provider allowance so
//                      password resets always have headroom
//
// Dry run unless --send is passed. Prints exactly who would receive what.
//
//   node scripts/nudge.mjs                  # dry run
//   node scripts/nudge.mjs --send           # actually send
//   NUDGE_MIN_DAYS=1 node scripts/nudge.mjs # per-person daily

import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SEND = process.argv.includes('--send');

const MIN_DAYS = Number(process.env.NUDGE_MIN_DAYS ?? 3);
const MAX_TIMES = Number(process.env.NUDGE_MAX_TIMES ?? 4);
// Under Resend's 100/day free allowance, leaving room for resets. Bulk mail
// must never be able to consume the quota a locked-out user depends on.
const DAILY_CAP = Number(process.env.NUDGE_DAILY_CAP ?? 40);
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

// A separate key from UNKAD_SEND_TOKEN on purpose. Password resets and bulk
// encouragement must not share an allowance, or a big morning run silently
// starves the one message somebody is actually waiting for.
const KEY = env.UNKAD_BULK_TOKEN;
const FROM = env.EMAIL_FROM_BULK ?? 'Unkad <no-reply@unkad.com>';

const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

// The founder's own words, verbatim, 28 Jul. One message for everyone: the
// two-variant draft was retired because his single text covers both asks,
// writing and validating, in his own voice. Do not edit the Somali here;
// changes go through him.
//
// The subject is the campaign name rather than composed Somali, so the one
// line he did not write is one that already exists everywhere on the platform.
// The unsubscribe line is the single remaining non-founder Somali string; it
// shipped in the drafts he reviewed.
const FOUNDER_BODY = (unsub) => `Asalaamu Calaykum

Mudane/Marwo waan kaaga mahad celineynaa sida wanaagsan ee aad oogu soo biirtay mareegtan iyo sida wanaagsan ee aad kaaga qeyb qaadatay olalahan lagu horumarinayo af somaliga si loo helo jumlado saxan oo somali ah nadiifna ah si loogu isticmaalo taba barida garaad gacmeedka.

waxaan kaa rajayneynaa inaad marar badan na soo booqato mareegtan kuna biiriso jumlado cuusb, turjumid jumlado english ah oo meesha yaala, ama u codeynta tayada qoraalada kale. aad baan kaaga mahad celineyna markale sida wanaagsan ee aad ugu soo biirtay mareegtan

${BASE}/contribute

Unkad Labs

Jooji iimaylada: ${unsub}`;

const COPY = {
  silent: { subject: 'Qor Af-Soomaali', body: (h, unsub) => FOUNDER_BODY(unsub) },
  validator: { subject: 'Qor Af-Soomaali', body: (h, unsub) => FOUNDER_BODY(unsub) },
};

const { rows } = await pool.query(
  `select u.id, u.handle, u.email,
          coalesce(u.nudge_count, 0) nudge_count,
          exists (select 1 from validations v where v.user_id = u.id) validates
     from users u
    where u.deleted_at is null
      and u.onboarding_completed_at is not null
      and u.email_opt_out_at is null
      and u.email_bounced_at is null
      and coalesce(u.nudge_count, 0) < $1
      and (u.last_nudge_at is null or u.last_nudge_at < now() - ($2 || ' days')::interval)
      -- The ask is "write something", so anyone who has is not the audience.
      and not exists (select 1 from submissions s where s.user_id = u.id)
      -- Give a new arrival a night before chasing them. Someone who signed up
      -- an hour ago has not ignored anything yet.
      and u.created_at < now() - interval '12 hours'
    order by u.created_at asc
    limit $3`,
  [MAX_TIMES, MIN_DAYS, DAILY_CAP]
);

// An address that cannot be valid is not worth a send. `gmail.con` is sitting
// in the table right now; a hard bounce costs sender reputation, and reputation
// is the asset this whole script is trying not to spend.
const SHAPE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const TYPOS = /@(gmail\.con|gmial\.com|gmai\.com|hotmial\.com|yahoo\.con|outlook\.con)$/i;
const bad = rows.filter((r) => !SHAPE.test(r.email) || TYPOS.test(r.email));
const good = rows.filter((r) => SHAPE.test(r.email) && !TYPOS.test(r.email));

console.log(`\n  ${SEND ? 'SENDING' : 'DRY RUN'} · ${new Date().toISOString()}`);
console.log(`  due: ${rows.length}  sendable: ${good.length}  skipped (bad address): ${bad.length}`);
console.log(`  rules: min ${MIN_DAYS}d apart · max ${MAX_TIMES} times · cap ${DAILY_CAP}/run\n`);

for (const r of bad) console.log(`  skip  ${r.email}  (address will bounce)`);

let sent = 0;
let failed = 0;

for (const r of good) {
  const variant = r.validates ? 'validator' : 'silent';
  const copy = COPY[variant];

  // Minted on first use rather than at signup, so accounts that are never
  // mailed never carry a token at all.
  let token = null;
  if (SEND) {
    const t = crypto.randomBytes(32).toString('hex');
    const { rows: [u] } = await pool.query(
      `update users set unsub_token = coalesce(unsub_token, $2), updated_at = now()
        where id = $1 returning unsub_token`,
      [r.id, t]
    );
    token = u.unsub_token;
  }
  const unsub = `${BASE}/unsubscribe/${token ?? '<minted-on-send>'}`;

  if (!SEND) {
    console.log(`  would send [${variant}]  ${r.handle} <${r.email}>  (asked ${r.nudge_count}x)`);
    continue;
  }

  if (!KEY) {
    console.error('  UNKAD_BULK_TOKEN not set; refusing to send through the reset key');
    process.exit(1);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [r.email],
      subject: copy.subject,
      text: copy.body(r.handle, unsub),
      // The header version of the same promise. Gmail and Outlook surface it as
      // a native unsubscribe button, and someone who uses that button is a
      // person who left rather than a spam complaint.
      headers: {
        'List-Unsubscribe': `<${unsub}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (res.ok) {
    await pool.query(
      `update users set last_nudge_at = now(), nudge_count = coalesce(nudge_count,0) + 1,
                        updated_at = now() where id = $1`,
      [r.id]
    );
    sent++;
    console.log(`  sent  [${variant}]  ${r.handle} <${r.email}>`);
  } else {
    const detail = await res.text().catch(() => '');
    failed++;
    console.error(`  FAIL  ${r.email}  ${res.status} ${detail.slice(0, 160)}`);
    // Only a refusal of the address itself is permanent. Rate limits and
    // outages are the provider's problem and must not retire a good address.
    if (res.status === 422) {
      await pool.query(`update users set email_bounced_at = now() where id = $1`, [r.id]);
    }
  }

  // Gentle on the provider, and it keeps a burst from looking like a blast.
  await new Promise((r) => setTimeout(r, 400));
}

if (SEND) console.log(`\n  sent ${sent}, failed ${failed}\n`);
else console.log(`\n  nothing sent. add --send to actually mail.\n`);

await pool.end();
