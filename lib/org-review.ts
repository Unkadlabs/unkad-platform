'use server';

// ============================================================================
// Organisation review: partner organisations checking released sentences.
//
// The sentences come from the database, not from Hugging Face: a released
// submission is one with release_id set that is still accepted, and splitting
// its normalised text with the same segmenter scripts/export.ts uses gives the
// exact rows of data/sentences.jsonl, ids included. So a teacher is reading
// what the public dataset says, and their verdict is keyed to the same id.
//
// Access is the seed-set model: one unguessable link per organisation, rate
// limited, never logged. The reviewer's name lives in a cookie scoped to
// /barayaasha so they type it once per device.
// ============================================================================

import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { auditLog, orgReviews, prompts, reviewOrgs, submissions } from './schema';
import { allow, clientIp } from './ratelimit';
import { normalizeForRelease } from './normalize';
import { splitSentences, isUsableSentence } from './sentences';

export type ReviewOrg = typeof reviewOrgs.$inferSelect;

export type OrgSentence = {
  id: string; // `<submission id>#<position>`
  submissionId: string;
  sector: string;
  text: string;
  before: string | null; // the sentence before it in the same document
  after: string | null;
};

const NAME_COOKIE = 'unkad_reviewer';
const SECTORS = [
  'health', 'education', 'agriculture', 'law', 'media',
  'religion', 'culture', 'technology', 'general',
] as const;

export async function getOrg(token: string): Promise<ReviewOrg | null> {
  if (!token || token.length < 20 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const ip = await clientIp();
  if (!(await allow(`org:lookup:${ip}`, 120, 300))) return null;

  const [row] = await db.select().from(reviewOrgs).where(eq(reviewOrgs.token, token));
  if (!row || !row.active) return null;
  return row;
}

export async function getReviewerName(): Promise<string | null> {
  const v = (await cookies()).get(NAME_COOKIE)?.value;
  return v ? decodeURIComponent(v) : null;
}

// The name is the only thing asked, and agreeing to the terms on the same
// screen is what makes a correction publishable under the dataset's licence.
export async function setReviewerName(token: string, name: string): Promise<string | null> {
  const org = await getOrg(token);
  if (!org) return 'ERR:not found';
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (clean.length < 2) return 'ERR:name';

  (await cookies()).set(NAME_COOKIE, encodeURIComponent(clean), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/barayaasha',
    maxAge: 60 * 60 * 24 * 365,
  });
  await db.insert(auditLog).values({
    action: 'org_review.consent',
    entityType: 'review_org',
    entityId: org.id,
    meta: { reviewer: clean },
  });
  return null;
}

// Every released sentence, optionally for one sector. A few thousand
// sentences, split on each call: cheap next to the round trip, and it can
// never drift from what the release actually contains.
async function releasedSentences(sector?: string): Promise<OrgSentence[]> {
  const sectorExpr = sql<string>`coalesce(${submissions.sector}, ${prompts.sector}, 'general')`;
  const rows = await db
    .select({ id: submissions.id, textSo: submissions.textSo, sector: sectorExpr })
    .from(submissions)
    .leftJoin(prompts, eq(submissions.promptId, prompts.id))
    .where(
      and(
        isNotNull(submissions.releaseId),
        eq(submissions.status, 'accepted'),
        sector ? sql`${sectorExpr} = ${sector}` : undefined
      )
    )
    .orderBy(submissions.createdAt);

  return rows.flatMap((r) => {
    const parts = splitSentences(normalizeForRelease(r.textSo)).filter(isUsableSentence);
    return parts.map((text, i) => ({
      id: `${r.id}#${i}`,
      submissionId: r.id,
      sector: String(r.sector),
      text,
      before: parts[i - 1] ?? null,
      after: parts[i + 1] ?? null,
    }));
  });
}

export async function sectorProgress(orgId: string) {
  const [all, done] = await Promise.all([
    releasedSentences(),
    db
      .select({ sector: orgReviews.sector, n: sql<number>`count(*)::int` })
      .from(orgReviews)
      .where(eq(orgReviews.orgId, orgId))
      .groupBy(orgReviews.sector),
  ]);
  const doneBy = Object.fromEntries(done.map((d) => [d.sector, d.n]));
  return SECTORS.map((s) => ({
    sector: s,
    total: all.filter((x) => x.sector === s).length,
    done: doneBy[s] ?? 0,
  })).filter((s) => s.total > 0);
}

// The next sentence nobody in the organisation has marked. Each reviewer walks
// the sector in their own fixed order, so two teachers working at once mostly
// see different sentences instead of racing for the same one.
export async function nextSentence(
  token: string,
  sector: string,
  skip: string[] = []
): Promise<OrgSentence | null> {
  const org = await getOrg(token);
  if (!org || !(SECTORS as readonly string[]).includes(sector)) return null;
  const name = (await getReviewerName()) ?? '';

  const [all, done] = await Promise.all([
    releasedSentences(sector),
    db
      .select({ id: orgReviews.sentenceId })
      .from(orgReviews)
      .where(and(eq(orgReviews.orgId, org.id), eq(orgReviews.sector, sector as (typeof SECTORS)[number]))),
  ]);
  const seen = new Set([...done.map((d) => d.id), ...skip]);
  const order = (id: string) => createHash('sha1').update(name + id).digest('hex');
  const open = all.filter((s) => !seen.has(s.id)).sort((a, b) => (order(a.id) < order(b.id) ? -1 : 1));
  return open[0] ?? null;
}

type Verdict = 'approve' | 'edit' | 'reject';

export async function saveReview(
  token: string,
  sentenceId: string,
  verdict: Verdict,
  editedText?: string,
  note?: string
): Promise<string | null> {
  const org = await getOrg(token);
  if (!org) return 'ERR:not found';
  const name = await getReviewerName();
  if (!name) return 'ERR:name';
  if (!['approve', 'edit', 'reject'].includes(verdict)) return 'ERR:verdict';

  const ip = await clientIp();
  if (!(await allow(`org:write:${org.id}:${ip}`, 600, 3600))) return 'ERR:too fast';

  // The sentence must be one the release actually contains, read from the
  // database rather than trusted from the browser.
  const [submissionId] = sentenceId.split('#');
  if (!/^[0-9a-f-]{36}$/.test(submissionId ?? '')) return 'ERR:sentence';
  const [doc] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), isNotNull(submissions.releaseId)));
  if (!doc) return 'ERR:sentence';
  const sentence = (await releasedSentences()).find((s) => s.id === sentenceId);
  if (!sentence) return 'ERR:sentence';

  const edited = editedText?.replace(/[ \t]+/g, ' ').trim() || null;
  if (verdict === 'edit' && (!edited || edited === sentence.text)) return 'ERR:no change';
  if (edited && edited.length > 2000) return 'ERR:too long';

  await db
    .insert(orgReviews)
    .values({
      orgId: org.id,
      sentenceId,
      submissionId: sentence.submissionId,
      sector: sentence.sector as (typeof SECTORS)[number],
      reviewerName: name,
      verdict,
      originalText: sentence.text,
      editedText: verdict === 'edit' ? edited : null,
      note: note?.trim().slice(0, 1000) || null,
    })
    // Someone else in the organisation got there first; theirs stands.
    .onConflictDoNothing();
  return null;
}

// What this reviewer has done, for the counter at the top of the page.
export async function reviewerCount(orgId: string): Promise<number> {
  const name = await getReviewerName();
  if (!name) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orgReviews)
    .where(and(eq(orgReviews.orgId, orgId), eq(orgReviews.reviewerName, name)));
  return row?.n ?? 0;
}
