// One email per contributor inviting them to the blind essay vote (/qiimee),
// Nov 2026. Sent once per person, in daily batches, until voting closes.
//
// Same brakes as scripts/nudge.mjs, for the same reason (one sending domain,
// one reputation): never anyone who opted out or hard-bounced, malformed
// addresses skipped, a per-run cap that leaves the provider's daily allowance
// for password resets. "Already invited" is recorded in the append-only
// audit_log (action email.qiimee_invite), so no schema change is needed and a
// rerun never mails the same person twice.
//
// Dry run unless --send. Reads production from .env.local (DATABASE_URL_UNPOOLED).
//
//   node scripts/qiimee-invite.mjs              # dry run: counts only
//   node scripts/qiimee-invite.mjs --send       # send up to the cap
//   INVITE_CAP=40 node scripts/qiimee-invite.mjs --send

import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SEND = process.argv.includes('--send');
const CAP = Number(process.env.INVITE_CAP ?? 50);
const BASE = 'https://qor.unkad.com';
const CLOSES = new Date('2026-11-26T20:59:00Z'); // Thu 26 Nov 2026 23:59 EAT

function loadEnv() {
  const f = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs.readFileSync(f, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        const raw = l.slice(i + 1).trim();
        // A quoted value ends at its closing quote; anything after it (a note
        // in .env.local) is not part of the value. Same as nudge-daily.sh.
        const m = raw.match(/^(["'])(.*?)\1/);
        return [l.slice(0, i).trim(), m ? m[2] : raw.replace(/\s+#.*$/, '')];
      })
  );
}
const env = { ...loadEnv(), ...process.env };
const KEY = env.UNKAD_BULK_TOKEN;
const FROM = env.EMAIL_FROM_BULK ?? 'Unkad <no-reply@unkad.com>';

if (new Date() >= CLOSES) {
  console.log('Voting has closed; nothing to send.');
  process.exit(0);
}

// Subject: the page title, founder-verified 21 Nov 2026.
// Body: the founder's own Facebook post (21 Nov 2026), with his greeting and
// sign-off from the reminder email and its founder-reviewed unsubscribe line.
// Do not edit the Somali here; changes go through him.
const SUBJECT = 'Qoraalkee Af-Soomaaligiisu wanaagsanyahay?';
const BODY = (unsub) => `Asalaamu Calaykum

Qoraaladan Af-Soomaali-ga ah waxaa qoray AI (garaad gacmeed). Midkee baa u eg Af-Soomaali dhab ah? Nagu caawi inaad akhriso saddexdan qoraal oo isku mawduuc ah, kadib dooro midka ugu wanaagsan iyo midka ugu liita. Dhowr daqiiqo kaliya ayay kaa qaadan doonta, akoon inaad samaysidna looma baahna.

Codkaagu wuxuu naga caawinayaa inaan fahanno waxa AI-ga ka caawiya inuu Af-Soomaali fiican qoro.

${BASE}/qiimee

Unkad Labs

Sidoo kale waad iska joojin kartaa in iimeyladan kusoo gaaraan: ${unsub}`;

const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: false }, keepAlive: true });

const { rows } = await pool.query(
  `select u.id, u.email
     from users u
    where u.deleted_at is null
      and u.is_guest = false
      and u.email is not null
      and u.onboarding_completed_at is not null
      and u.email_opt_out_at is null
      and u.email_bounced_at is null
      and not exists (select 1 from audit_log a
                       where a.action = 'email.qiimee_invite' and a.entity_id = u.id)
    order by u.created_at asc`
);
const SHAPE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const TYPOS = /@(gmail\.con|gmial\.com|gmai\.com|hotmial\.com|yahoo\.con|outlook\.con)$/i;
const good = rows.filter((r) => SHAPE.test(r.email) && !TYPOS.test(r.email));
const batch = good.slice(0, CAP);

console.log(`\n  ${SEND ? 'SENDING' : 'DRY RUN'} · ${new Date().toISOString()}`);
console.log(`  not yet invited: ${rows.length} · sendable: ${good.length} · skipped (bad address): ${rows.length - good.length}`);
console.log(`  this run: ${batch.length} (cap ${CAP}) · left after this run: ${good.length - batch.length}`);

if (!SEND) {
  console.log('\n  Subject: ' + SUBJECT + '\n');
  console.log(BODY(`${BASE}/unsubscribe/<personal-link>`).replace(/^/gm, '  | '));
  console.log('\n  nothing sent. add --send to actually mail.\n');
  await pool.end();
  process.exit(0);
}
if (!KEY) {
  console.error('  UNKAD_BULK_TOKEN not set; refusing to send through the reset key');
  process.exit(1);
}

let sent = 0, failed = 0;
for (const r of batch) {
  const t = crypto.randomBytes(32).toString('hex');
  const { rows: [u] } = await pool.query(
    `update users set unsub_token = coalesce(unsub_token, $2), updated_at = now() where id = $1 returning unsub_token`,
    [r.id, t]
  );
  const unsub = `${BASE}/unsubscribe/${u.unsub_token}`;
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [r.email], subject: SUBJECT, text: BODY(unsub),
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    failed++;
    console.error(`  SKIP (network) ${err.message}`);
    continue;
  }
  if (res.ok) {
    await pool.query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, meta) values (null, 'email.qiimee_invite', 'user', $1, '{}'::jsonb)`,
      [r.id]
    );
    sent++;
  } else {
    failed++;
    console.error(`  FAIL ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);
    if (res.status === 422) await pool.query(`update users set email_bounced_at = now() where id = $1`, [r.id]);
    if (res.status === 429) { console.error('  provider limit reached; stopping this run'); break; }
  }
  await new Promise((s) => setTimeout(s, 400));
}
console.log(`\n  sent ${sent}, failed ${failed}; still to invite: ${good.length - sent}\n`);
await pool.end();
