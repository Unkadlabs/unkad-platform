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
import {
  createSession,
  destroySession,
  getCurrentUser,
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

  const promptId = String(formData.get('promptId') ?? '');
  const textSo = String(formData.get('textSo') ?? '').trim();
  if (!promptId || textSo.length < 10) redirect('/contribute');

  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
  if (!prompt || !prompt.active) redirect('/contribute');

  await db.insert(submissions).values({
    promptId: prompt.id,
    userId: user.id,
    mode: prompt.mode,
    textSo,
    textEn: prompt.mode === 'translate' ? prompt.sourceText : null,
    dialect: user.dialect,
    charCount: textSo.length,
  });

  revalidatePath('/dashboard');
  redirect(`/contribute/${prompt.mode}?done=1`);
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
      .innerJoin(prompts, eq(submissions.promptId, prompts.id))
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
      topic,
    });
  }
  redirect('/admin?added=' + rows.length);
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
