// The whole platform picture in one compact run.
//
// Exists because status was being answered with ad-hoc queries pasted into a
// session, each one re-deriving the same numbers and each one burning context
// on a table dump. This prints everything that question actually needs, once,
// in a dozen lines.
//
//   THANKS_ENV=/path/to/.env.prod node scripts/status.mjs
//   node scripts/status.mjs            # local database

import { Pool } from 'pg';
// One definition of a sentence, shared with the app and the exporter.
import { splitSentences as split, isUsableSentence as usable, countSentences as count } from '../lib/sentences.mjs';
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
const cs = env.DATABASE_URL || env.POSTGRES_URL_NON_POOLING;
const local = /localhost|127\.0\.0\.1/.test(cs ?? '');
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });


const [subs, agg, prov] = await Promise.all([
  pool.query(`select s.text_so, s.status::text st, (s.verified_by is not null) ver,
      count(*) filter (where v.verdict='approve' and not v.is_reviewer_vote) pa
    from submissions s
    left join validations v on v.submission_id = s.id
    join users u on u.id = s.user_id
    where u.deleted_at is null group by s.id`),
  pool.query(`select
    (select count(*) from users where deleted_at is null) registered,
    (select count(*) from users where deleted_at is null and onboarding_completed_at is not null) onboarded,
    (select count(distinct user_id) from submissions) wrote,
    (select count(*) from users where email_opt_out_at is not null) opted_out,
    (select count(*) from submissions where created_at > now() - interval '24 hours') subs24,
    (select count(distinct user_id) from submissions where created_at > now() - interval '24 hours') writers24,
    (select count(*) from validations where created_at > now() - interval '24 hours') votes24,
    (select count(*) from users where created_at > now() - interval '24 hours') signups24,
    (select count(*) from releases) releases`),
  pool.query(`select provenance_cleared_at is not null cleared from users where handle ilike '%sharafdin%'`),
]);

let written = 0, peer = 0, verified = 0, pending = 0, rejected = 0;
for (const r of subs.rows) {
  const n = split(r.text_so).filter(usable).length;
  // Written means the living corpus. Rejected text is counted separately so a
  // cleanup shows up as a drop in trash, never as inflated progress: the
  // Telegram-copy purge removed ~150 sentences that a naive total would have
  // kept presenting as milestone credit.
  if (r.st === 'rejected') { rejected += n; continue; }
  written += n;
  if (r.ver) verified += n;
  if (r.st === 'accepted' && Number(r.pa) >= 2) peer += n;
  if (r.st === 'pending' || r.st === 'escalated') pending += n;
}

const a = agg.rows[0];
console.log(`sentences ${written} live (${rejected} rejected) · peer-accepted ${peer} · awaiting ${pending} · verified ${verified}`);
console.log(`people ${a.registered} registered · ${a.onboarded} onboarded · ${a.wrote} ever wrote · ${a.opted_out} opted out of mail`);
console.log(`last 24h: ${a.subs24} subs from ${a.writers24} writers · ${a.votes24} votes · ${a.signups24} signups`);
console.log(`releases ${a.releases} · sharafdin flag ${prov.rows[0]?.cleared ? 'CLEARED' : 'open'}`);
await pool.end();
