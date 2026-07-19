// Read-model queries for the richer UI: corpus progress, personal
// daily activity, streaks, and coverage breakdowns.

import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from './db';
import { submissions, users, validations, prompts } from './schema';

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
        sql`${prompts.id} not in (select prompt_id from submissions where user_id = ${userId})`
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

// Accepted submissions by register (for the personal dashboard).
export async function userRegisterBreakdown(userId: string) {
  return db
    .select({ register: prompts.register, n: count() })
    .from(submissions)
    .innerJoin(prompts, eq(submissions.promptId, prompts.id))
    .where(and(eq(submissions.userId, userId), eq(submissions.status, 'accepted')))
    .groupBy(prompts.register);
}
