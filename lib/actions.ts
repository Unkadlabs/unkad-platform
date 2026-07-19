'use server';

// Server actions: auth, contribution, validation.
// Validation policy (from the concept note): peer agreement decides.
//   2 approvals  -> accepted (+reputation for the author)
//   2 rejections -> rejected
//   1–1 split    -> escalated to trusted reviewers (their vote decides)

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { and, eq, ne, notInArray, sql } from 'drizzle-orm';
import { db } from './db';
import { users, prompts, submissions, validations } from './schema';
import { createSession, destroySession, getCurrentUser } from './auth';

const APPROVALS_NEEDED = 2;
const REJECTIONS_NEEDED = 2;
const REP_ACCEPTED_SUBMISSION = 2;
const REP_VALIDATION = 1;

// ---- Auth ----------------------------------------------------------------

export async function signup(_prev: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const handle = String(formData.get('handle') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !handle || password.length < 8) return 'errRequired';

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) return 'errEmailTaken';

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ email, handle, passwordHash }).returning();
  await createSession(user.id);
  redirect('/contribute');
}

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return 'errRequired';

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return 'errBadLogin';

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return 'errBadLogin';

  await createSession(user.id);
  redirect('/contribute');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

// ---- Contribution --------------------------------------------------------

export async function submitContribution(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

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
  });

  revalidatePath('/dashboard');
  redirect(`/contribute/${prompt.mode}?done=1`);
}

// A prompt of the given mode this user hasn't already answered.
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

// ---- Validation ----------------------------------------------------------

// A pending submission this user didn't write and hasn't already voted on.
export async function nextSubmissionToValidate(userId: string, isReviewer: boolean) {
  const voted = db
    .select({ id: validations.submissionId })
    .from(validations)
    .where(eq(validations.userId, userId));

  const rows = await db
    .select({
      submission: submissions,
      prompt: prompts,
    })
    .from(submissions)
    .innerJoin(prompts, eq(submissions.promptId, prompts.id))
    .where(
      and(
        // Reviewers see escalated items first; contributors see pending ones.
        eq(submissions.status, isReviewer ? 'escalated' : 'pending'),
        ne(submissions.userId, userId),
        notInArray(submissions.id, voted)
      )
    )
    .orderBy(sql`random()`)
    .limit(1);

  if (rows.length > 0 || !isReviewer) return rows[0] ?? null;

  // No escalated items — reviewers fall back to the pending queue.
  const pending = await db
    .select({ submission: submissions, prompt: prompts })
    .from(submissions)
    .innerJoin(prompts, eq(submissions.promptId, prompts.id))
    .where(
      and(
        eq(submissions.status, 'pending'),
        ne(submissions.userId, userId),
        notInArray(submissions.id, voted)
      )
    )
    .orderBy(sql`random()`)
    .limit(1);

  return pending[0] ?? null;
}

export async function castValidation(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const submissionId = String(formData.get('submissionId') ?? '');
  const verdict = String(formData.get('verdict') ?? '');
  if (!submissionId || (verdict !== 'approve' && verdict !== 'reject')) redirect('/validate');

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
  if (!submission || submission.userId === user.id) redirect('/validate');
  if (submission.status === 'accepted' || submission.status === 'rejected') redirect('/validate');

  const isReviewer = user.role === 'reviewer' || user.role === 'admin';

  await db
    .insert(validations)
    .values({ submissionId, userId: user.id, verdict: verdict as 'approve' | 'reject' })
    .onConflictDoNothing();

  // Reviewer votes settle escalated items immediately.
  if (submission.status === 'escalated' && isReviewer) {
    await settle(submissionId, verdict === 'approve' ? 'accepted' : 'rejected', submission.userId);
    await bump(user.id, REP_VALIDATION);
    redirect('/validate');
  }

  // Tally peer votes.
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
      .set({ status: 'escalated' })
      .where(eq(submissions.id, submissionId));
  }

  await bump(user.id, REP_VALIDATION);
  redirect('/validate');
}

async function settle(
  submissionId: string,
  status: 'accepted' | 'rejected',
  authorId: string
) {
  await db.update(submissions).set({ status }).where(eq(submissions.id, submissionId));
  if (status === 'accepted') {
    await bump(authorId, REP_ACCEPTED_SUBMISSION);
  }
}

async function bump(userId: string, points: number) {
  await db
    .update(users)
    .set({ reputation: sql`${users.reputation} + ${points}` })
    .where(eq(users.id, userId));
}

// ---- Admin ---------------------------------------------------------------

export async function addPrompts(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/');

  const mode = String(formData.get('mode') ?? 'write') as 'write' | 'translate' | 'transcribe';
  const register = String(formData.get('register') ?? 'conversational') as
    | 'conversational'
    | 'narrative'
    | 'instructional'
    | 'formal'
    | 'technical';
  const topic = String(formData.get('topic') ?? 'general').trim();
  // One prompt per line: "somali text || english text || optional source text"
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
      };
    });

  if (rows.length > 0) {
    await db.insert(prompts).values(rows);
  }
  redirect('/admin?added=' + rows.length);
}
