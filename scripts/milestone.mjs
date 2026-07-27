// How close the corpus is to a milestone worth announcing.
//
// The public counters answer "how much text is there". That is not the number a
// launch post can stand on, because "accepted" arrives by three different roads
// and only one of them supports the sentence people will actually read:
//
//   peer          two contributors independently approved it. This is the
//                 claim. Two Somali speakers who do not know each other read
//                 the same sentence and both said yes.
//   reviewer      the peers split 1-1 and a reviewer settled it. Sound, but it
//                 is one person deciding, not two agreeing, so it cannot be
//                 described as two independent approvals.
//   admin         ruled directly from the admin tools, bypassing validation
//                 entirely. Legitimate as an override and worth nothing as
//                 evidence of agreement.
//
// Lumping them together would let a bulk ruling manufacture a milestone
// overnight, and the post would claim peer review that never happened. So they
// are counted apart and only `peer` counts toward the goal.
//
// Sentences, not submissions: milestones are stated in sentences, and the split
// matches lib/sentences.ts exactly. Counting submissions here would report a
// different number from every other surface.
//
//   node scripts/milestone.mjs
//   node scripts/milestone.mjs --json
//   node scripts/milestone.mjs --goal 5000
//
// Reads .env.local by default; point THANKS_ENV at another env file to run it
// against production.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const GOAL = (() => {
  const i = process.argv.indexOf('--goal');
  return i === -1 ? 2000 : Number(process.argv[i + 1]);
})();
const JSON_OUT = process.argv.includes('--json');

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
  console.error('no DATABASE_URL; set it or point THANKS_ENV at an env file');
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(cs);
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

// Identical to lib/sentences.ts. Kept inline rather than imported because this
// runs as a plain script with no TypeScript build step.
const split = (r) =>
  !r ? [] : r.replace(/\r/g, '').split(/(?<=[.!?؟۔])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const usable = (s) => s.length >= 10 && s.split(/\s+/).length >= 3;
const count = (t) => split(t).filter(usable).length;

const { rows } = await pool.query(`
  select s.id, s.text_so, s.status::text st, s.created_at,
         (s.verified_by is not null) verified,
         count(*) filter (where v.verdict = 'approve' and not v.is_reviewer_vote) peer_approvals,
         count(*) filter (where v.is_reviewer_vote) reviewer_votes
    from submissions s
    left join validations v on v.submission_id = s.id
    left join users u on u.id = s.user_id
   where u.deleted_at is null
   group by s.id
`);

const tally = { peer: 0, reviewer: 0, admin: 0, pending: 0, escalated: 0, rejected: 0, verified: 0 };
let written = 0;
// Peer-accepted sentences per day, so the projection is built on the rate of
// the thing being measured rather than on how fast people write.
const peerByDay = new Map();

for (const r of rows) {
  const n = count(r.text_so);
  written += n;
  if (r.verified) tally.verified += n;

  if (r.st === 'accepted') {
    // Order matters. A submission can carry peer approvals *and* a reviewer
    // vote; what settled it is the stronger fact, so peer agreement is checked
    // first and only genuine peer agreement counts toward the goal.
    if (Number(r.peer_approvals) >= 2) {
      tally.peer += n;
      const d = r.created_at.toISOString().slice(0, 10);
      peerByDay.set(d, (peerByDay.get(d) ?? 0) + n);
    } else if (Number(r.reviewer_votes) > 0) {
      tally.reviewer += n;
    } else {
      tally.admin += n;
    }
  } else if (r.st === 'pending') tally.pending += n;
  else if (r.st === 'escalated') tally.escalated += n;
  else if (r.st === 'rejected') tally.rejected += n;
}

const remaining = Math.max(0, GOAL - tally.peer);
const reached = remaining === 0;

// Rate from the last seven days that had any peer-accepted work, not the last
// seven calendar days. A quiet weekend should not read as a collapse in pace,
// and a single burst day should not read as a trend.
const active = [...peerByDay.entries()].sort().slice(-7).map(([, n]) => n);
const perDay = active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
const daysOut = perDay > 0 ? Math.ceil(remaining / perDay) : null;

// The ceiling nobody can cross by reviewing faster: everything already written
// but not yet peer-accepted. If this is below the goal, no amount of validation
// gets there and more writing is the only route.
const headroom = tally.peer + tally.pending + tally.escalated;

const out = {
  goal: GOAL,
  reached,
  peerAccepted: tally.peer,
  remaining,
  written,
  verified: tally.verified,
  awaitingReview: tally.pending + tally.escalated,
  reviewerSettled: tally.reviewer,
  adminRuled: tally.admin,
  rejected: tally.rejected,
  peerPerDay: Number(perDay.toFixed(1)),
  daysOut,
  reachableWithoutMoreWriting: headroom >= GOAL,
};

if (JSON_OUT) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const pad = (s) => String(s).padStart(7);
  console.log(`\n  Milestone: ${GOAL.toLocaleString()} peer-accepted sentences`);
  console.log(`  ${reached ? 'REACHED' : `${remaining.toLocaleString()} to go`}\n`);
  console.log(`  ${pad(tally.peer.toLocaleString())}  peer-accepted   (two independent approvals)`);
  console.log(`  ${pad((tally.pending + tally.escalated).toLocaleString())}  awaiting review`);
  console.log(`  ${pad(tally.reviewer.toLocaleString())}  reviewer-settled`);
  console.log(`  ${pad(tally.admin.toLocaleString())}  admin-ruled     (not peer-reviewed)`);
  console.log(`  ${pad(tally.rejected.toLocaleString())}  rejected`);
  console.log(`  ${pad(written.toLocaleString())}  written in total`);
  console.log(`  ${pad(tally.verified.toLocaleString())}  linguist-verified\n`);
  if (!reached) {
    console.log(`  Pace: ${perDay.toFixed(1)} peer-accepted sentences per active day`);
    console.log(`  ETA:  ${daysOut == null ? 'no pace yet, nothing to project from' : `~${daysOut} day(s)`}`);
    if (!out.reachableWithoutMoreWriting) {
      console.log(
        `  Note: only ${headroom.toLocaleString()} sentences exist that could ever reach this bar.\n` +
        `        Reviewing faster cannot get to ${GOAL.toLocaleString()}; more has to be written.`
      );
    }
  }
  console.log('');
}

await pool.end();
// Exit 0 on reached, 1 on not yet, so a scheduler can branch on it without
// parsing anything.
process.exit(reached ? 0 : 1);
