// Personal weekly goals: the read model.
//
// A goal is two numbers the contributor chose (sentences to write and
// validations to cast per week) plus a notify flag. Progress is never
// stored; it is computed from submissions and validations over a
// rolling 7-day window ending today, the same tables the streak and
// the corpus counters read, so the goal card cannot drift from the
// rest of the platform.
//
// The share-of-the-campaign math lives here too: a weekly goal shown
// next to what remains of the 100,000 is the whole point of the
// feature, every contributor seeing their own slice move the total.

import { and, count, eq, gte, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from './db';
import { goals, submissions, validations } from './schema';
import { CORPUS_GOAL, corpusStats } from './stats';

export type Goal = {
  weeklyWrite: number;
  weeklyValidate: number;
  notify: boolean;
  createdAt: Date;
};

export type GoalProgress = {
  goal: Goal;
  // Rolling 7-day window ending today.
  wroteThisWeek: number;
  validatedThisWeek: number;
  // Days in the window with zero activity of either kind.
  daysMissed: number;
  // The mini-goal against the big one.
  campaignRemaining: number;
  // weeklyWrite as a share of what remains, e.g. 0.0004 = 0.04%.
  shareOfRemaining: number;
  // At this weekly pace, sentences added in 12 weeks.
  twelveWeekPace: number;
};

export async function getGoal(userId: string): Promise<Goal | null> {
  const [row] = await db
    .select({
      weeklyWrite: goals.weeklyWrite,
      weeklyValidate: goals.weeklyValidate,
      notify: goals.notify,
      createdAt: goals.createdAt,
    })
    .from(goals)
    .where(eq(goals.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function goalProgress(userId: string): Promise<GoalProgress | null> {
  const goal = await getGoal(userId);
  if (!goal) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [[subs], subDays, valDays, corpus] = await Promise.all([
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), gte(submissions.createdAt, since))),
    db
      .select({ day: dayExpr(submissions.createdAt) })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), gte(submissions.createdAt, since)))
      .groupBy(dayExpr(submissions.createdAt)),
    db
      .select({ day: dayExpr(validations.createdAt) })
      .from(validations)
      .where(and(eq(validations.userId, userId), gte(validations.createdAt, since)))
      .groupBy(dayExpr(validations.createdAt)),
    corpusStats(),
  ]);

  const [vals] = await db
    .select({ n: count() })
    .from(validations)
    .where(and(eq(validations.userId, userId), gte(validations.createdAt, since)));

  const activeDays = new Set([...subDays.map((r) => r.day), ...valDays.map((r) => r.day)]);
  // Count whole days in the window (including today) without activity.
  let daysMissed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    if (!activeDays.has(d.toISOString().slice(0, 10))) daysMissed++;
  }

  const campaignRemaining = Math.max(0, CORPUS_GOAL - corpus.accepted);
  const weekly = goal.weeklyWrite;
  return {
    goal,
    wroteThisWeek: subs.n,
    validatedThisWeek: vals.n,
    daysMissed,
    campaignRemaining,
    shareOfRemaining: campaignRemaining > 0 ? weekly / campaignRemaining : 0,
    twelveWeekPace: weekly * 12,
  };
}

// to_char(...) day bucketing, shared shape with lib/stats.ts.
function dayExpr(col: AnyPgColumn) {
  return sql<string>`to_char(${col}, 'YYYY-MM-DD')`;
}
