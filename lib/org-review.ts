'use server';

// ============================================================================
// Organisation review: partner organisations checking released sentences.
//
// The sentences are read from the published file itself, data/sentences.jsonl
// in the Hugging Face dataset, so the teachers check exactly what the public
// has downloaded, and each verdict is keyed to that file's sentence id. When a
// new release lands, the next load picks it up.
//
// Access is the seed-set model: one unguessable link per organisation, rate
// limited, never logged. The reviewer's name lives in a cookie scoped to
// /barayaasha so they type it once per device.
// ============================================================================

import { and, eq, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { auditLog, orgReviews, reviewOrgs } from './schema';
import { allow, clientIp } from './ratelimit';

export type ReviewOrg = typeof reviewOrgs.$inferSelect;

export type OrgSentence = {
  id: string; // `<document id>#<position>`
  documentId: string;
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

// Two ways in: the unguessable token, or the organisation's short name as a
// clean link (/barayaasha/ubahs, and /ubahs redirects there). The short name
// is public by nature, which is acceptable because the sentences are already
// published and every verdict carries the name its reviewer typed.
export async function getOrg(token: string): Promise<ReviewOrg | null> {
  if (!token || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const ip = await clientIp();
  if (!(await allow(`org:lookup:${ip}`, 120, 300))) return null;

  const [row] = await db
    .select()
    .from(reviewOrgs)
    .where(
      token.length >= 20
        ? eq(reviewOrgs.token, token)
        : sql`lower(${reviewOrgs.shortName}) = ${token.toLowerCase()}`
    );
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

// The published sentences, as Hugging Face serves them. About 1.4 MB, so it
// is held in memory for an hour rather than fetched on every click; too big
// for Next's fetch cache to keep reliably, which is why that is bypassed.
const HF_SENTENCES =
  process.env.ORG_REVIEW_SOURCE ??
  'https://huggingface.co/datasets/unkadlabs/qor-af-soomaali/resolve/main/data/sentences.jsonl';
const TTL = 60 * 60 * 1000;
let memo: { at: number; rows: OrgSentence[] } | null = null;

type HfRow = { id: string; document_id: string; position: number; sector: string; text_so: string };

async function releasedSentences(sector?: string): Promise<OrgSentence[]> {
  if (!memo || Date.now() - memo.at > TTL) {
    const res = await fetch(HF_SENTENCES, { cache: 'no-store' });
    if (!res.ok) {
      // Keep serving the last good copy rather than an empty page.
      if (memo) return sector ? memo.rows.filter((r) => r.sector === sector) : memo.rows;
      throw new Error(`Hugging Face returned ${res.status}`);
    }
    const raw: HfRow[] = (await res.text())
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
    // Neighbours come from the same document, by position.
    const byId = new Map(raw.map((r) => [r.id, r]));
    const rows = raw.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      sector: r.sector || 'general',
      text: r.text_so,
      before: byId.get(`${r.document_id}#${r.position - 1}`)?.text_so ?? null,
      after: byId.get(`${r.document_id}#${r.position + 1}`)?.text_so ?? null,
    }));
    memo = { at: Date.now(), rows };
  }
  return sector ? memo.rows.filter((r) => r.sector === sector) : memo.rows;
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

  // The sentence must be one the published file actually contains, looked up
  // on the server rather than trusted from the browser.
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
      documentId: sentence.documentId,
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
