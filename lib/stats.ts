// Read-model queries for the richer UI: corpus progress, personal
// daily activity, streaks, and coverage breakdowns.

import { and, asc, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { db } from './db';
import { submissions, users, validations, prompts } from './schema';
import { countSentences } from './sentences';

// The public campaign goal: 100,000 validated sentences.
export const CORPUS_GOAL = 100_000;

export async function corpusStats() {
  const [[accepted], [pending], [contributors]] = await Promise.all([
    db.select({ n: count() }).from(submissions).where(eq(submissions.status, 'accepted')),
    db.select({ n: count() }).from(submissions).where(eq(submissions.status, 'pending')),
    db.select({ n: count() }).from(users).where(sql`${users.deletedAt} is null`),
  ]);
  return { accepted: accepted.n, pending: pending.n, contributors: contributors.n };
}

// Submissions per day for the last `days` days (all statuses) for one user.
export async function userDailyCounts(userId: string, days = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`,
      n: count(),
    })
    .from(submissions)
    .where(and(eq(submissions.userId, userId), gte(submissions.createdAt, since)))
    .groupBy(sql`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`);

  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  const out: { day: string; n: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: byDay.get(key) ?? 0 });
  }
  return out;
}

// How many tasks (submissions + validations) the user completed today.
export async function todayCount(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [[subs], [vals]] = await Promise.all([
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), gte(submissions.createdAt, start))),
    db
      .select({ n: count() })
      .from(validations)
      .where(and(eq(validations.userId, userId), gte(validations.createdAt, start))),
  ]);
  return subs.n + vals.n;
}

// Consecutive active days ending today or yesterday.
export async function activityStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ day: sql<string>`to_char(${submissions.createdAt}, 'YYYY-MM-DD')` })
    .from(submissions)
    .where(eq(submissions.userId, userId))
    .groupBy(sql`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${submissions.createdAt}, 'YYYY-MM-DD') desc`)
    .limit(60);

  const active = new Set(rows.map((r) => r.day));
  let streak = 0;
  const cursor = new Date();
  // A streak may end yesterday without breaking (today not contributed yet).
  if (!active.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (active.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Open tasks per mode for this user (active prompts they haven't answered).
export async function availableTaskCounts(userId: string) {
  const rows = await db
    .select({ mode: prompts.mode, n: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.active, true),
        // prompt_id is null (proverbs) must stay out of the NOT IN set.
        sql`${prompts.id} not in (select prompt_id from submissions where user_id = ${userId} and prompt_id is not null)`
      )
    )
    .groupBy(prompts.mode);

  const byMode = Object.fromEntries(rows.map((r) => [r.mode, r.n]));
  const [pendingToValidate] = await db
    .select({ n: count() })
    .from(submissions)
    .where(and(eq(submissions.status, 'pending'), sql`${submissions.userId} != ${userId}`));

  return {
    write: byMode.write ?? 0,
    translate: byMode.translate ?? 0,
    transcribe: byMode.transcribe ?? 0,
    validate: pendingToValidate.n,
  };
}

// Open prompts per sector for one user in one mode — feeds the sector picker
// on the contribute page, so contributors can steer their work into an
// industry and empty sectors never render as dead-end choices.
export async function openSectorCounts(
  userId: string,
  mode: 'write' | 'translate' | 'transcribe'
) {
  const rows = await db
    .select({ sector: prompts.sector, n: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.mode, mode),
        eq(prompts.active, true),
        sql`${prompts.id} not in (select prompt_id from submissions where user_id = ${userId} and prompt_id is not null)`
      )
    )
    .groupBy(prompts.sector)
    .orderBy(desc(count()));

  return rows.map((r) => ({ sector: r.sector, n: Number(r.n) }));
}

// Accepted submissions by register (for the personal dashboard).
export async function userRegisterBreakdown(userId: string) {
  return db
    .select({ register: prompts.register, n: count() })
    .from(submissions)
    .innerJoin(prompts, eq(submissions.promptId, prompts.id))
    .where(and(eq(submissions.userId, userId), eq(submissions.status, 'accepted')))
    .groupBy(prompts.register);
}

// Public leaderboard rows. Ranked by reputation — which is what the ranking
// has always meant here: 2 points per accepted item, 1 per validation, so
// people who validate their neighbours' work place alongside people who
// write. Only public-safe fields; this page needs no session.
export async function leaderboardRows(limit = 25) {
  const accepted = sql<number>`count(${submissions.id}) filter (where ${submissions.status} = 'accepted')`;

  const [rows, voteRows] = await Promise.all([
    db
      .select({
        id: users.id,
        handle: users.handle,
        dialect: users.dialect,
        reputation: users.reputation,
        submitted: sql<number>`count(${submissions.id})`,
        accepted,
        // Work in flight. On a launch day nothing is accepted yet, so without
        // this the whole board would read as empty while people are writing.
        pending: sql<number>`count(${submissions.id}) filter (where ${submissions.status} in ('pending', 'escalated'))`,
        chars: sql<number>`coalesce(sum(${submissions.charCount}) filter (where ${submissions.status} = 'accepted'), 0)`,
      })
      .from(users)
      .leftJoin(submissions, eq(submissions.userId, users.id))
      .where(isNull(users.deletedAt))
      .groupBy(users.id)
      .orderBy(desc(users.reputation), desc(accepted), desc(sql`count(${submissions.id})`))
      // Over-fetch: people who have done nothing yet are dropped below.
      .limit(limit * 2 + 10),
    db
      .select({ userId: validations.userId, n: count() })
      .from(validations)
      .groupBy(validations.userId),
  ]);

  const votes = new Map(voteRows.map((r) => [r.userId, Number(r.n)]));

  return rows
    .map((r) => ({
      id: r.id,
      handle: r.handle,
      dialect: r.dialect,
      reputation: r.reputation,
      submitted: Number(r.submitted),
      accepted: Number(r.accepted),
      pending: Number(r.pending),
      chars: Number(r.chars),
      validations: votes.get(r.id) ?? 0,
    }))
    .filter((r) => r.submitted > 0 || r.validations > 0)
    .slice(0, limit);
}

// ============================================================================
// Admin monitoring read-models (/admin/activity)
//
// These answer the launch-day questions the counters on /admin can't: what
// are people actually writing, who is engaged, which sectors the incoming
// corpus covers, and whether the pipeline can still turn work into a dataset.
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function fillDays(rows: { day: string; n: number }[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.n)]));
  const out: { day: string; n: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    out.push({ day: key, n: byDay.get(key) ?? 0 });
  }
  return out;
}

// Signups, submissions, and validations per day — the launch-day pulse.
export async function adminActivity(days = 14) {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const [subs, vals, signups] = await Promise.all([
    db
      .select({ day: sql<string>`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`, n: count() })
      .from(submissions)
      .where(gte(submissions.createdAt, since))
      .groupBy(sql`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({ day: sql<string>`to_char(${validations.createdAt}, 'YYYY-MM-DD')`, n: count() })
      .from(validations)
      .where(gte(validations.createdAt, since))
      .groupBy(sql`to_char(${validations.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({ day: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`, n: count() })
      .from(users)
      .where(gte(users.createdAt, since))
      .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`),
  ]);

  return {
    submissions: fillDays(subs, days),
    validations: fillDays(vals, days),
    signups: fillDays(signups, days),
  };
}

// What the incoming corpus actually looks like — counted from submissions,
// not from the prompt bank. Register comes via a LEFT join so proverb-mode
// items (no prompt) are counted rather than dropped.
export async function submissionBreakdown() {
  const [bySector, byMode, byDialect, byRegister] = await Promise.all([
    db
      .select({ key: submissions.sector, n: count() })
      .from(submissions)
      .groupBy(submissions.sector),
    db
      .select({
        key: submissions.mode,
        n: count(),
        chars: sql<number>`coalesce(sum(${submissions.charCount}), 0)`,
      })
      .from(submissions)
      .groupBy(submissions.mode),
    db
      .select({ key: submissions.dialect, n: count() })
      .from(submissions)
      .groupBy(submissions.dialect),
    db
      .select({ key: prompts.register, n: count() })
      .from(submissions)
      .leftJoin(prompts, eq(submissions.promptId, prompts.id))
      .groupBy(prompts.register),
  ]);

  const clean = (rows: { key: string | null; n: number }[]) =>
    rows
      .map((r) => ({ key: r.key ?? 'unset', n: Number(r.n) }))
      .sort((a, b) => b.n - a.n);

  return {
    bySector: clean(bySector),
    byMode: byMode.map((r) => ({ key: r.key, n: Number(r.n), chars: Number(r.chars) })),
    byDialect: clean(byDialect),
    byRegister: clean(byRegister),
  };
}

// Per-contributor engagement: how much they wrote, how it landed, whether
// they also validate, and when they were last seen.
export async function contributorActivity(limit = 100) {
  const [rows, voteRows] = await Promise.all([
    db
      .select({
        id: users.id,
        handle: users.handle,
        role: users.role,
        dialect: users.dialect,
        region: users.region,
        reputation: users.reputation,
        joinedAt: users.createdAt,
        submitted: sql<number>`count(${submissions.id})`,
        accepted: sql<number>`count(${submissions.id}) filter (where ${submissions.status} = 'accepted')`,
        rejected: sql<number>`count(${submissions.id}) filter (where ${submissions.status} = 'rejected')`,
        pending: sql<number>`count(${submissions.id}) filter (where ${submissions.status} in ('pending', 'escalated'))`,
        chars: sql<number>`coalesce(sum(${submissions.charCount}), 0)`,
        lastSubmissionAt: sql<string | null>`max(${submissions.createdAt})`,
      })
      .from(users)
      .leftJoin(submissions, eq(submissions.userId, users.id))
      .where(isNull(users.deletedAt))
      .groupBy(users.id)
      .orderBy(desc(sql`count(${submissions.id})`), desc(users.createdAt))
      .limit(limit),
    db
      .select({ userId: validations.userId, n: count() })
      .from(validations)
      .groupBy(validations.userId),
  ]);

  const votes = new Map(voteRows.map((r) => [r.userId, Number(r.n)]));

  return rows.map((r) => ({
    ...r,
    submitted: Number(r.submitted),
    accepted: Number(r.accepted),
    rejected: Number(r.rejected),
    pending: Number(r.pending),
    chars: Number(r.chars),
    validations: votes.get(r.id) ?? 0,
    lastSubmissionAt: r.lastSubmissionAt ? new Date(r.lastSubmissionAt) : null,
  }));
}

// The newest submissions, all statuses, with their text — so an admin can
// read what is actually coming in without waiting for peer acceptance.
export async function recentSubmissions(limit = 30) {
  return db
    .select({ submission: submissions, author: users })
    .from(submissions)
    .innerJoin(users, eq(submissions.userId, users.id))
    .orderBy(desc(submissions.createdAt))
    .limit(limit);
}

// Can the pipeline still turn contributions into a dataset? Every stage
// between "someone wrote a sentence" and "it ships in a release".
export async function pipelineHealth() {
  const [[pending], [escalated], [awaitingVerify], [verified], [reviewers], [released]] =
    await Promise.all([
      db.select({ n: count() }).from(submissions).where(eq(submissions.status, 'pending')),
      db.select({ n: count() }).from(submissions).where(eq(submissions.status, 'escalated')),
      db
        .select({ n: count() })
        .from(submissions)
        .where(and(eq(submissions.status, 'accepted'), isNull(submissions.verifiedAt))),
      db
        .select({ n: count() })
        .from(submissions)
        .where(sql`${submissions.verifiedAt} is not null`),
      db
        .select({ n: count() })
        .from(users)
        .where(and(isNull(users.deletedAt), sql`${users.role} in ('reviewer', 'admin')`)),
      db
        .select({ n: count() })
        .from(submissions)
        .where(sql`${submissions.releaseId} is not null`),
    ]);

  return {
    pending: pending.n,
    escalated: escalated.n,
    awaitingVerify: awaitingVerify.n,
    verified: verified.n,
    reviewers: reviewers.n,
    released: released.n,
  };
}

// Prompt supply per mode, and how many onboarded contributors have already
// answered every active prompt in that mode (they see "no tasks" and leave).
export async function promptSupply() {
  const [activeRows, answeredRows, [onboarded]] = await Promise.all([
    db
      .select({ mode: prompts.mode, n: count() })
      .from(prompts)
      .where(eq(prompts.active, true))
      .groupBy(prompts.mode),
    db
      .select({
        userId: submissions.userId,
        mode: submissions.mode,
        n: sql<number>`count(distinct ${submissions.promptId})`,
      })
      .from(submissions)
      .where(sql`${submissions.promptId} is not null`)
      .groupBy(submissions.userId, submissions.mode),
    db
      .select({ n: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), sql`${users.onboardingCompletedAt} is not null`)),
  ]);

  const active = new Map(activeRows.map((r) => [r.mode, Number(r.n)]));

  return (['write', 'translate', 'transcribe'] as const).map((mode) => {
    const total = active.get(mode) ?? 0;
    const exhausted = answeredRows.filter(
      (r) => r.mode === mode && total > 0 && Number(r.n) >= total
    ).length;
    return { mode, total, exhausted, onboarded: onboarded.n };
  });
}

// ============================================================================
// One contributor, in full (/admin/contributors/[id])
//
// The activity table answers "who is contributing". It cannot answer "should I
// trust this". When a single account holds most of the corpus, the second
// question is the one that decides whether a dataset ships, so this read-model
// is built around it: everything that account wrote, how the corpus shifts if
// they are removed, and the timing evidence for whether the text was composed
// on the platform or arrived from somewhere else.
// ============================================================================

// Sustained human typing tops out around 10 characters per second, and that is
// a competition typist on familiar text. Above that, the text was not composed
// in the box during the gap. That is not automatically wrong — drafting
// offline and pasting your own work is legitimate — but it does mean the
// keystrokes are no evidence of authorship, and the licence question has to be
// settled some other way.
//
// 25 rather than the human ceiling of 10, because a gap only bounds the time
// between two submissions, not the time spent writing: anyone who drafted the
// next piece while the previous one was in flight will clear 10 honestly. The
// headroom costs sensitivity and buys the right to be believed when it does
// fire. At 15 this flagged a contributor for one line out of twenty-six.
const IMPLAUSIBLE_CHARS_PER_SEC = 25;

// One fast submission is a person who prepared. A whole account arriving that
// way is a different claim, so the warning banner waits for a pattern: enough
// occurrences to rule out coincidence, and a large enough share of their work
// that it characterises the account rather than one moment in it. Individual
// rows are still marked either way, so nothing is hidden from review.
const PATTERN_MIN_COUNT = 5;
const PATTERN_MIN_SHARE = 0.2;

export type ContributorProfile = NonNullable<Awaited<ReturnType<typeof contributorProfile>>>;

export async function contributorProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [rows, votesCast, votesReceived, corpusTotals] = await Promise.all([
    // Their whole body of work, oldest first so the timing gaps below read
    // forwards. Joined to prompts so prompted items can show what was asked.
    db
      .select({ submission: submissions, prompt: prompts })
      .from(submissions)
      .leftJoin(prompts, eq(submissions.promptId, prompts.id))
      .where(eq(submissions.userId, userId))
      .orderBy(asc(submissions.createdAt)),

    // How they judge other people's work. A reviewer who approves everything
    // is not reviewing.
    db
      .select({ verdict: validations.verdict, n: count() })
      .from(validations)
      .where(eq(validations.userId, userId))
      .groupBy(validations.verdict),

    // How their peers judged them.
    db
      .select({ verdict: validations.verdict, n: count() })
      .from(validations)
      .innerJoin(submissions, eq(validations.submissionId, submissions.id))
      .where(eq(submissions.userId, userId))
      .groupBy(validations.verdict),

    // Corpus-wide figures, so this contributor's share can be stated rather
    // than left for the reader to work out.
    db
      .select({
        subs: count(),
        chars: sql<number>`coalesce(sum(${submissions.charCount}), 0)`,
      })
      .from(submissions),
  ]);

  const items = rows.map(({ submission, prompt }) => ({
    ...submission,
    sentences: countSentences(submission.textSo),
    promptTopic: prompt?.topic ?? null,
    promptRegister: prompt?.register ?? null,
    promptSource: prompt?.sourceText ?? null,
  }));

  const sum = (pick: (i: (typeof items)[number]) => number) =>
    items.reduce((total, i) => total + pick(i), 0);

  const byStatus = (status: string) => items.filter((i) => i.status === status);

  // ---- Timing --------------------------------------------------------------
  // Gap to the previous submission, and the implied composition rate. The very
  // first submission has no predecessor and is left out rather than counted
  // against the account's whole session length, which would flatter it.
  const paced = items.map((item, i) => {
    if (i === 0) return { id: item.id, gapSec: null as number | null, charsPerSec: null };
    const gapSec = Math.round(
      (item.createdAt.getTime() - items[i - 1].createdAt.getTime()) / 1000
    );
    return {
      id: item.id,
      gapSec,
      charsPerSec: gapSec > 0 ? item.charCount / gapSec : null,
    };
  });
  const rateById = new Map(paced.map((p) => [p.id, p]));
  const rates = paced.map((p) => p.charsPerSec).filter((r): r is number => r != null);
  const implausible = paced.filter(
    (p) => p.charsPerSec != null && p.charsPerSec > IMPLAUSIBLE_CHARS_PER_SEC
  );
  const gaps = paced.map((p) => p.gapSec).filter((g): g is number => g != null).sort((a, b) => a - b);

  // ---- Self-similarity -----------------------------------------------------
  // Repeated openings are how bulk-pasted material usually shows itself: the
  // same first line recurring across submissions that are meant to be
  // independent pieces of writing.
  const openings = new Map<string, number>();
  for (const item of items) {
    const head = item.textSo.trim().slice(0, 40).toLowerCase();
    if (head.length >= 10) openings.set(head, (openings.get(head) ?? 0) + 1);
  }
  const repeatedOpenings = [...openings.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([head, n]) => ({ head, n }));

  // ---- Coverage ------------------------------------------------------------
  const group = <K extends string>(key: (i: (typeof items)[number]) => K | null) => {
    const acc = new Map<string, { n: number; chars: number; sentences: number }>();
    for (const item of items) {
      const k = key(item) ?? 'unset';
      const cur = acc.get(k) ?? { n: 0, chars: 0, sentences: 0 };
      cur.n += 1;
      cur.chars += item.charCount;
      cur.sentences += item.sentences;
      acc.set(k, cur);
    }
    return [...acc.entries()]
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.sentences - a.sentences || b.n - a.n);
  };

  // ---- Daily shape ---------------------------------------------------------
  const perDay = new Map<string, number>();
  for (const item of items) {
    const day = item.createdAt.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const days = [...perDay.entries()].map(([day, n]) => ({ day, n })).sort((a, b) => a.day.localeCompare(b.day));

  // Hour of day, in UTC. A burst confined to one or two hours is a session;
  // work spread across the clock is a habit.
  const perHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    n: items.filter((i) => i.createdAt.getUTCHours() === h).length,
  }));

  const votes = (rows: { verdict: string; n: number }[]) => {
    const approve = Number(rows.find((r) => r.verdict === 'approve')?.n ?? 0);
    const reject = Number(rows.find((r) => r.verdict === 'reject')?.n ?? 0);
    return { approve, reject, total: approve + reject };
  };

  const chars = sum((i) => i.charCount);
  const sentences = sum((i) => i.sentences);
  const corpusChars = Number(corpusTotals[0]?.chars ?? 0);
  const corpusSubs = Number(corpusTotals[0]?.subs ?? 0);

  return {
    user,
    items: [...items].reverse(), // newest first for reading
    rateById,

    totals: {
      submitted: items.length,
      accepted: byStatus('accepted').length,
      rejected: byStatus('rejected').length,
      pending: byStatus('pending').length,
      escalated: byStatus('escalated').length,
      chars,
      sentences,
      verified: items.filter((i) => i.verifiedAt).length,
      // What the corpus loses if this account is removed.
      shareOfSubs: corpusSubs ? items.length / corpusSubs : 0,
      shareOfChars: corpusChars ? chars / corpusChars : 0,
    },

    pace: {
      avgChars: items.length ? Math.round(chars / items.length) : 0,
      maxChars: items.reduce((m, i) => Math.max(m, i.charCount), 0),
      avgSentences: items.length ? sentences / items.length : 0,
      medianGapSec: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
      fastestGapSec: gaps.length ? gaps[0] : null,
      peakCharsPerSec: rates.length ? Math.max(...rates) : null,
      implausibleCount: implausible.length,
      implausibleIds: new Set(implausible.map((p) => p.id)),
      threshold: IMPLAUSIBLE_CHARS_PER_SEC,
      // Whether this rises to a claim about the account, not just about a
      // few submissions. Only this drives the warning banner.
      isPattern:
        implausible.length >= PATTERN_MIN_COUNT &&
        paced.length > 0 &&
        implausible.length / paced.length >= PATTERN_MIN_SHARE,
      implausibleShare: paced.length ? implausible.length / paced.length : 0,
    },

    repeatedOpenings,
    bySector: group((i) => i.sector),
    byMode: group((i) => i.mode),
    byDialect: group((i) => i.dialect),
    byRegister: group((i) => i.promptRegister),
    days,
    perHour,
    votesCast: votes(votesCast as { verdict: string; n: number }[]),
    votesReceived: votes(votesReceived as { verdict: string; n: number }[]),
  };
}
