'use server';

// ============================================================================
// Server actions (v2): auth with lockout, multi-step onboarding, contribution,
// validation, and audited admin operations.
//
// Validation policy: 2 peer approvals accept · 2 rejections reject ·
// a 1–1 split escalates · a reviewer/admin vote settles escalations.
// ============================================================================

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { and, eq, ne, notInArray, sql } from 'drizzle-orm';
import { db } from './db';
import { users, prompts, submissions, validations, auditLog, sources } from './schema';
import { allow, clientIp } from './ratelimit';
import {
  createSession,
  destroySession,
  getCurrentUser,
  revokeAllSessions,
  requireUser,
  requireOnboarded,
  requireRole,
  isReviewer,
  MAX_FAILED_LOGINS,
  LOCKOUT_MINUTES,
} from './auth';

const APPROVALS_NEEDED = 2;
const REJECTIONS_NEEDED = 2;
const REP_ACCEPTED_SUBMISSION = 2;
const REP_VALIDATION = 1;

async function audit(
  actorId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Record<string, unknown>
) {
  await db.insert(auditLog).values({ actorId, action, entityType, entityId, meta });
}

// ---- Auth ------------------------------------------------------------------

export async function signup(_prev: string | null, formData: FormData): Promise<string | null> {
  // Honeypot: real users never fill this hidden field.
  if (String(formData.get('website') ?? '') !== '') return 'errRequired';

  const ip = await clientIp();
  if (!(await allow(`signup:${ip}`, 5, 3600))) return 'errRateLimited';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const handle = String(formData.get('handle') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !handle || password.length < 8) return 'errRequired';

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) return 'errEmailTaken';

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, handle, passwordHash }).returning();
  await createSession(user.id);
  redirect('/onboarding');
}

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const ip = await clientIp();
  if (!(await allow(`login:${ip}`, 20, 3600))) return 'errRateLimited';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return 'errRequired';

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || user.deletedAt) return 'errBadLogin';

  if (user.lockedUntil && user.lockedUntil > new Date()) return 'errLocked';

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    const locked = failed >= MAX_FAILED_LOGINS;
    await db
      .update(users)
      .set({
        failedLogins: locked ? 0 : failed,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      })
      .where(eq(users.id, user.id));
    if (locked) await audit(user.id, 'auth.lockout', 'user', user.id);
    return locked ? 'errLocked' : 'errBadLogin';
  }

  await db
    .update(users)
    .set({ failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, user.id));
  await createSession(user.id);

  const needsOnboarding = !user.consentAt || !user.onboardingCompletedAt;
  redirect(needsOnboarding ? '/onboarding' : '/contribute');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

// Rotating a password revokes every existing session — including any an
// attacker holds — then issues a fresh one so the person doing it stays
// logged in on this device.
export async function changePassword(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const current = await requireUser();

  if (!(await allow(`password:${current.id}`, 10, 3600))) return 'errRateLimited';

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');

  if (!currentPassword || !newPassword) return 'errRequired';
  if (newPassword.length < 8) return 'errPasswordShort';

  const [user] = await db.select().from(users).where(eq(users.id, current.id));
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return 'errWrongPassword';
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(newPassword, 12), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await revokeAllSessions(user.id);
  await createSession(user.id);
  await audit(user.id, 'auth.password_changed', 'user', user.id);

  redirect('/account?changed=1');
}

// ---- Onboarding ------------------------------------------------------------

export async function saveProfile(_prev: string | null, formData: FormData): Promise<string | null> {
  const user = await requireUser();

  const dialect = String(formData.get('dialect') ?? '');
  const region = String(formData.get('region') ?? '').trim();
  const country = String(formData.get('country') ?? '').trim();

  if (!['maxaa_tiri', 'maay', 'both', 'other'].includes(dialect)) return 'errRequired';

  await db
    .update(users)
    .set({
      dialect: dialect as 'maxaa_tiri' | 'maay' | 'both' | 'other',
      region: region || null,
      country: country || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  redirect('/onboarding');
}

export async function giveConsent(_prev: string | null, formData: FormData): Promise<string | null> {
  const user = await requireUser();

  const creditChoice = String(formData.get('creditChoice') ?? '');
  const creditName = String(formData.get('creditName') ?? '').trim();
  const agreed = formData.get('agree') === 'on';

  if (!agreed) return 'errConsentRequired';
  if (!['handle', 'real_name', 'anonymous'].includes(creditChoice)) return 'errRequired';
  if (creditChoice === 'real_name' && !creditName) return 'errRequired';

  await db
    .update(users)
    .set({
      consentAt: new Date(),
      creditChoice: creditChoice as 'handle' | 'real_name' | 'anonymous',
      creditName: creditChoice === 'real_name' ? creditName : null,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await audit(user.id, 'user.consented', 'user', user.id, { creditChoice });
  redirect('/contribute');
}

// ---- Contribution ----------------------------------------------------------

export async function submitContribution(formData: FormData): Promise<void> {
  const user = await requireOnboarded();

  // `mode` is carried in a hidden field so any failure can return the
  // contributor to the page they were on, with a reason, instead of a silent
  // bounce to /contribute that discarded their text.
  const mode = String(formData.get('mode') ?? 'write');

  if (!(await allow(`submit:${user.id}`, 200, 86400))) redirect(`/contribute/${mode}?error=cap`);

  const promptId = String(formData.get('promptId') ?? '');
  const textSo = String(formData.get('textSo') ?? '').trim();
  if (!promptId) redirect(`/contribute/${mode}?error=unavailable`);
  if (textSo.length < 10) redirect(`/contribute/${mode}?error=short`);

  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
  if (!prompt || !prompt.active) redirect(`/contribute/${mode}?error=unavailable`);

  await db.insert(submissions).values({
    promptId: prompt.id,
    userId: user.id,
    mode: prompt.mode,
    textSo,
    textEn: prompt.mode === 'translate' ? prompt.sourceText : null,
    dialect: user.dialect,
    sector: prompt.sector,
    charCount: textSo.length,
  });

  revalidatePath('/dashboard');
  // Carry the submitted prompt id so its saved draft is cleared now, on
  // success, rather than on the submit attempt where a failure would lose it.
  redirect(`/contribute/${prompt.mode}?done=${prompt.id}`);
}

// Proverb mode: free contribution, no prompt needed.
export async function submitProverb(formData: FormData): Promise<void> {
  const user = await requireOnboarded();

  if (!(await allow(`submit:${user.id}`, 200, 86400))) redirect('/contribute/proverb?error=cap');

  const proverb = String(formData.get('proverb') ?? '').trim();
  const translation = String(formData.get('translation') ?? '').trim();
  const meaning = String(formData.get('meaning') ?? '').trim();

  if (proverb.length < 5 || translation.length < 5 || meaning.length < 10) {
    redirect('/contribute/proverb?error=short');
  }

  await db.insert(submissions).values({
    promptId: null,
    userId: user.id,
    mode: 'proverb',
    textSo: proverb,
    textEn: translation,
    meaningEn: meaning,
    dialect: user.dialect,
    sector: 'culture',
    charCount: proverb.length,
  });

  revalidatePath('/dashboard');
  redirect('/contribute/proverb?done=1');
}

export async function nextPromptFor(userId: string, mode: 'write' | 'translate' | 'transcribe') {
  const answered = db
    .select({ id: submissions.promptId })
    .from(submissions)
    .where(eq(submissions.userId, userId));

  const rows = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.mode, mode), eq(prompts.active, true), notInArray(prompts.id, answered)))
    .orderBy(sql`random()`)
    .limit(1);

  return rows[0] ?? null;
}

// ---- Validation ------------------------------------------------------------

export async function nextSubmissionToValidate(userId: string, reviewer: boolean) {
  const voted = db
    .select({ id: validations.submissionId })
    .from(validations)
    .where(eq(validations.userId, userId));

  const queue = async (status: 'pending' | 'escalated') =>
    db
      .select({ submission: submissions, prompt: prompts })
      .from(submissions)
      .leftJoin(prompts, eq(submissions.promptId, prompts.id))
      .where(
        and(
          eq(submissions.status, status),
          ne(submissions.userId, userId),
          notInArray(submissions.id, voted)
        )
      )
      .orderBy(sql`random()`)
      .limit(1);

  if (reviewer) {
    const escalated = await queue('escalated');
    if (escalated.length > 0) return escalated[0];
  }
  const pending = await queue('pending');
  return pending[0] ?? null;
}

export async function castValidation(formData: FormData): Promise<void> {
  const user = await requireOnboarded();

  if (!(await allow(`validate:${user.id}`, 500, 86400))) redirect('/validate');

  const submissionId = String(formData.get('submissionId') ?? '');
  const verdict = String(formData.get('verdict') ?? '');
  if (!submissionId || (verdict !== 'approve' && verdict !== 'reject')) redirect('/validate');

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
  if (!submission || submission.userId === user.id) redirect('/validate');
  if (submission.status === 'accepted' || submission.status === 'rejected') redirect('/validate');

  const reviewer = isReviewer(user);

  await db
    .insert(validations)
    .values({
      submissionId,
      userId: user.id,
      verdict: verdict as 'approve' | 'reject',
      isReviewerVote: reviewer && submission.status === 'escalated',
    })
    .onConflictDoNothing();

  if (submission.status === 'escalated' && reviewer) {
    await settle(submissionId, verdict === 'approve' ? 'accepted' : 'rejected', submission.userId);
    await audit(user.id, 'validation.settled', 'submission', submissionId, { verdict });
    await bump(user.id, REP_VALIDATION);
    redirect('/validate');
  }

  const votes = await db
    .select({ verdict: validations.verdict })
    .from(validations)
    .where(eq(validations.submissionId, submissionId));

  const approvals = votes.filter((v) => v.verdict === 'approve').length;
  const rejections = votes.filter((v) => v.verdict === 'reject').length;

  if (approvals >= APPROVALS_NEEDED) {
    await settle(submissionId, 'accepted', submission.userId);
  } else if (rejections >= REJECTIONS_NEEDED) {
    await settle(submissionId, 'rejected', submission.userId);
  } else if (approvals >= 1 && rejections >= 1) {
    await db
      .update(submissions)
      .set({ status: 'escalated', updatedAt: new Date() })
      .where(eq(submissions.id, submissionId));
  }

  await bump(user.id, REP_VALIDATION);
  redirect('/validate');
}

async function settle(submissionId: string, status: 'accepted' | 'rejected', authorId: string) {
  await db
    .update(submissions)
    .set({ status, updatedAt: new Date() })
    .where(eq(submissions.id, submissionId));
  if (status === 'accepted') await bump(authorId, REP_ACCEPTED_SUBMISSION);
}

async function bump(userId: string, points: number) {
  await db
    .update(users)
    .set({ reputation: sql`${users.reputation} + ${points}`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ---- Admin -----------------------------------------------------------------

export async function addPrompts(formData: FormData): Promise<void> {
  const user = await requireRole('admin');

  const mode = String(formData.get('mode') ?? 'write') as 'write' | 'translate' | 'transcribe';
  const register = String(formData.get('register') ?? 'conversational') as
    | 'conversational'
    | 'narrative'
    | 'instructional'
    | 'formal'
    | 'technical';
  const sector = String(formData.get('sector') ?? 'general') as
    | 'health'
    | 'education'
    | 'agriculture'
    | 'law'
    | 'media'
    | 'religion'
    | 'culture'
    | 'technology'
    | 'general';
  const topic = String(formData.get('topic') ?? 'general').trim();
  const sourceId = String(formData.get('sourceId') ?? '').trim();
  // One prompt per line: "somali text || english text || optional source sentence"
  const batch = String(formData.get('batch') ?? '').trim();
  if (!batch) redirect('/admin');

  const rows = batch
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [textSo = '', textEn = '', sourceText = ''] = line.split('||').map((s) => s.trim());
      return {
        mode,
        register,
        sector,
        topic,
        textSo: textSo || textEn,
        textEn: textEn || textSo,
        sourceText: mode === 'translate' ? sourceText || textEn : null,
        sourceId: mode === 'transcribe' && sourceId ? sourceId : null,
      };
    });

  if (rows.length > 0) {
    await db.insert(prompts).values(rows);
    await audit(user.id, 'prompts.batch_add', 'prompt', undefined, {
      count: rows.length,
      mode,
      register,
      sector,
      topic,
    });
  }
  redirect('/admin?added=' + rows.length);
}

// ---- Linguist verification (second tier) -----------------------------------

// Batch sign-off: reviewers verify peer-accepted items in bulk.
export async function verifyBatch(formData: FormData): Promise<void> {
  const reviewer = await requireRole('reviewer');

  const ids = formData
    .getAll('ids')
    .map(String)
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) redirect('/review');

  const now = new Date();
  let verified = 0;
  for (const id of ids) {
    const result = await db
      .update(submissions)
      .set({ verifiedAt: now, verifiedBy: reviewer.id, updatedAt: now })
      .where(
        and(
          eq(submissions.id, id),
          eq(submissions.status, 'accepted'),
          sql`${submissions.verifiedAt} is null`
        )
      )
      .returning({ id: submissions.id });
    verified += result.length;
  }

  await audit(reviewer.id, 'review.batch_verified', 'submission', undefined, {
    count: verified,
  });
  redirect(`/review?verified=${verified}`);
}

// A linguist can overturn a peer-accepted item that is actually wrong.
// The submission id is bound at render time (overturnSubmission.bind).
export async function overturnSubmission(id: string, _formData: FormData): Promise<void> {
  const reviewer = await requireRole('reviewer');

  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/review');

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!submission || submission.status !== 'accepted' || submission.verifiedAt) {
    redirect('/review');
  }

  await db
    .update(submissions)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(submissions.id, id));

  await audit(reviewer.id, 'review.overturned', 'submission', id);
  redirect('/review');
}

export async function addSource(formData: FormData): Promise<void> {
  const user = await requireRole('admin');

  const title = String(formData.get('title') ?? '').trim();
  const license = String(formData.get('license') ?? '').trim();
  if (!title || !license) redirect('/admin');

  const [source] = await db
    .insert(sources)
    .values({
      title,
      license,
      author: String(formData.get('author') ?? '').trim() || null,
      year: Number(formData.get('year')) || null,
      url: String(formData.get('url') ?? '').trim() || null,
      notes: String(formData.get('notes') ?? '').trim() || null,
      verifiedBy: user.id,
    })
    .returning();

  await audit(user.id, 'sources.add', 'source', source.id, { title, license });
  redirect('/admin');
}

export async function setUserRole(formData: FormData): Promise<void> {
  const admin = await requireRole('admin');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '');
  if (!email || !['contributor', 'reviewer', 'admin'].includes(role)) redirect('/admin');

  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!target) redirect('/admin?roleerr=1');

  await db
    .update(users)
    .set({ role: role as 'contributor' | 'reviewer' | 'admin', updatedAt: new Date() })
    .where(eq(users.id, target.id));

  await audit(admin.id, 'user.role_change', 'user', target.id, { email, role });
  redirect('/admin?rolechanged=1');
}
