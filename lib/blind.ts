// The public blind essay vote (/qiimee).
//
// Unkad study "does Qor in context make Claude write better Somali?" (research
// repo unkad-qor-context, Deviation 3). 40 sets of three AI-written essays;
// a voter picks the most and the least natural Somali in each. The essays ship
// here; which condition wrote which letter lives only in the research repo's
// answer key, so nothing on this platform can unblind the study.

import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { sql, eq } from 'drizzle-orm';
import { db } from './db';
import { blindVotes } from './schema';
import setsJson from './data/blind-sets.json';

export type BlindSet = { id: string; essays: [string, string, string] };
export const BLIND_SETS = setsJson as BlindSet[];
export const LETTERS = ['A', 'B', 'C'] as const;

// Voting closes Thursday 26 November 2026, 23:59 EAT (UTC+3), as pre-registered.
export const CLOSES_AT = new Date('2026-11-26T20:59:00Z');
export const isClosed = (now = new Date()) => now >= CLOSES_AT;

export const VOTER_COOKIE = 'unkad_blind';
export const NATIVE_COOKIE = 'unkad_blind_native';

export const hashVoter = (token: string) => createHash('sha256').update(`blind:${token}`).digest('hex');

// Read-only: the voter's key if this browser has voted before. The cookie is
// only ever set by the vote action (server components cannot set cookies).
export async function currentVoterKey(): Promise<string | null> {
  const token = (await cookies()).get(VOTER_COOKIE)?.value;
  return token && /^[0-9a-f]{64}$/.test(token) ? hashVoter(token) : null;
}

export async function votedSets(voterKey: string | null): Promise<Set<string>> {
  if (!voterKey) return new Set();
  const rows = await db
    .select({ setId: blindVotes.setId })
    .from(blindVotes)
    .where(eq(blindVotes.voterKey, voterKey));
  return new Set(rows.map((r) => r.setId));
}

// The set with the fewest votes that this voter has not yet voted on, so
// coverage stays even across the 40. Ties are broken by a per-voter rotation,
// so a burst of new voters from one post does not all land on the same set.
export async function nextSet(voterKey: string | null, done: Set<string>): Promise<BlindSet | null> {
  const rows = await db
    .select({ setId: blindVotes.setId, n: sql<number>`count(*)::int` })
    .from(blindVotes)
    .groupBy(blindVotes.setId);
  const counts = new Map(rows.map((r) => [r.setId, r.n]));
  const open = BLIND_SETS.filter((s) => !done.has(s.id));
  if (open.length === 0) return null;
  const seed = voterKey ? parseInt(voterKey.slice(0, 8), 16) : Math.floor(Math.random() * 1e9);
  const rot = (i: number) => (i + seed) % BLIND_SETS.length;
  return open
    .map((s) => ({ s, n: counts.get(s.id) ?? 0, r: rot(BLIND_SETS.indexOf(s)) }))
    .sort((a, b) => a.n - b.n || a.r - b.r)[0].s;
}

export async function voteTotals(): Promise<{ votes: number; voters: number }> {
  const [row] = await db
    .select({
      votes: sql<number>`count(*)::int`,
      voters: sql<number>`count(distinct ${blindVotes.voterKey})::int`,
    })
    .from(blindVotes);
  return { votes: row?.votes ?? 0, voters: row?.voters ?? 0 };
}
