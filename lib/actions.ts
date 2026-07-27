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
import { createHash, randomBytes } from 'crypto';
import { and, count, desc, eq, ne, notInArray, sql } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  prompts,
  submissions,
  submissionRevisions,
  validations,
  auditLog,
  sources,
  passwordResets,
} from './schema';
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

  // `mode` (and the chosen sector, if any) are carried in hidden fields so
  // any failure can return the contributor to the page they were on, with a
  // reason, instead of a silent bounce to /contribute that discarded their
  // text — and so success keeps them working in their chosen sector.
  const mode = String(formData.get('mode') ?? 'write');
  const rawSector = String(formData.get('sector') ?? '');
  const sectorQs = (prompts.sector.enumValues as readonly string[]).includes(rawSector)
    ? `&sector=${rawSector}`
    : '';

  if (!(await allow(`submit:${user.id}`, 200, 86400))) {
    redirect(`/contribute/${mode}?error=cap${sectorQs}`);
  }

  const promptId = String(formData.get('promptId') ?? '');
  const textSo = String(formData.get('textSo') ?? '').trim();
  if (!promptId) redirect(`/contribute/${mode}?error=unavailable${sectorQs}`);
  if (textSo.length < 10) redirect(`/contribute/${mode}?error=short${sectorQs}`);

  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
  if (!prompt || !prompt.active) redirect(`/contribute/${mode}?error=unavailable${sectorQs}`);

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
  redirect(`/contribute/${prompt.mode}?done=${prompt.id}${sectorQs}`);
}

// Free write: the contributor brings their own topic. No prompt, so no
// per-person ceiling — sector is their choice (validated against the enum),
// register is unknowable and stays null.
export async function submitFreeWrite(formData: FormData): Promise<void> {
  const user = await requireOnboarded();

  if (!(await allow(`submit:${user.id}`, 200, 86400))) redirect('/contribute/free?error=cap');

  const rawSector = String(formData.get('sector') ?? '');
  const topic = String(formData.get('topic') ?? '').trim().slice(0, 120);
  const textSo = String(formData.get('textSo') ?? '').trim();

  const sector = (prompts.sector.enumValues as readonly string[]).includes(rawSector)
    ? (rawSector as (typeof prompts.sector.enumValues)[number])
    : null;
  if (!sector) redirect('/contribute/free?error=sector');
  if (textSo.length < 10) redirect('/contribute/free?error=short');

  await db.insert(submissions).values({
    promptId: null,
    userId: user.id,
    mode: 'write',
    textSo,
    topic: topic || null,
    dialect: user.dialect,
    sector,
    charCount: textSo.length,
  });

  revalidatePath('/dashboard');
  redirect('/contribute/free?done=1');
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

export async function nextPromptFor(
  userId: string,
  mode: 'write' | 'translate' | 'transcribe',
  // Contributors can steer their work into a sector; unset means any.
  sector?: (typeof prompts.sector.enumValues)[number]
) {
  // Exclude proverb rows (promptId NULL): a single NULL in a NOT IN subquery
  // makes the whole predicate unknown, which read as "no tasks" in every
  // prompted mode for anyone who had contributed a proverb.
  const answered = db
    .select({ id: submissions.promptId })
    .from(submissions)
    .where(and(eq(submissions.userId, userId), sql`${submissions.promptId} is not null`));

  const rows = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.mode, mode),
        eq(prompts.active, true),
        notInArray(prompts.id, answered),
        sector ? eq(prompts.sector, sector) : undefined
      )
    )
    // Stable per contributor, spread across contributors.
    //
    // This was `random()`, which handed a different prompt out on every page
    // load. Drafts autosave per prompt (`unkad-draft-<promptId>`), so anyone
    // who started writing, left, and came back got a new prompt and no way to
    // reach the one they had been working on. Their text was still in the
    // browser and permanently out of sight. A contributor put it exactly that
    // way: leaving the site makes it hard to get back to where you were.
    //
    // Hashing the prompt id together with the user id keeps the answer stable
    // for one person — come back tomorrow and you get the same prompt, and the
    // editor restores your draft — while still giving different people
    // different starting points, which is what random() was there for.
    .orderBy(sql`md5(${prompts.id}::text || ${userId})`)
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

  const picked = reviewer ? (await queue('escalated'))[0] ?? (await queue('pending'))[0]
                          : (await queue('pending'))[0];
  if (!picked) return null;

  // How the item has been judged so far, and whether anyone has already
  // corrected it. Both are shown on the validate screen: a validator deciding
  // on a sentence should be able to see that two people already read it, and
  // that a reviewer changed a word.
  //
  // At most one prior vote can exist on a pending item, because the second one
  // settles it, so this exposes very little that could sway a judgement. An
  // escalated item is a 1-1 split, which the page already announces.
  const [votes, revisions] = await Promise.all([
    db
      .select({ verdict: validations.verdict, n: count() })
      .from(validations)
      .where(eq(validations.submissionId, picked.submission.id))
      .groupBy(validations.verdict),
    db
      .select({ text: submissionRevisions.textSo, note: submissionRevisions.note,
                at: submissionRevisions.createdAt, editor: users.handle })
      .from(submissionRevisions)
      .innerJoin(users, eq(submissionRevisions.editedBy, users.id))
      .where(eq(submissionRevisions.submissionId, picked.submission.id))
      .orderBy(desc(submissionRevisions.createdAt)),
  ]);

  const approve = Number(votes.find((v) => v.verdict === 'approve')?.n ?? 0);
  const reject = Number(votes.find((v) => v.verdict === 'reject')?.n ?? 0);

  return { ...picked, votes: { approve, reject, total: approve + reject }, revisions };
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
    .set({
      // Floored at zero. Points can now be taken back when an admin overturns
      // an accepted item, and an account that earned its reputation before that
      // was possible would otherwise be driven negative by history it never had
      // the chance to bank.
      reputation: sql`greatest(0, ${users.reputation} + ${points})`,
      updatedAt: new Date(),
    })
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

// ---- Admin rulings from a contributor's page --------------------------------

// The normal path to a verdict is peer validation, and it should stay that way:
// two neighbours reading a sentence is better evidence than one founder
// skimming. But peer validation assumes submissions arrive one at a time from
// people acting independently. When one account holds most of the corpus and
// its provenance is in question, waiting for two neighbours to work through
// forty items individually is the wrong tool, and leaving them pending is a
// decision too.
//
// So an admin reading a contributor's page can rule directly. This deliberately
// bypasses APPROVALS_NEEDED — it is an override, not a shortcut, which is why
// every ruling is audited with the count and the reason it applied to.
export async function ruleOnSubmissions(decision: string, formData: FormData): Promise<void> {
  const ids = formData
    .getAll('ids')
    .map(String)
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  await applyRuling(ids, decision, formData);
}

// Ruling on a single row. Two things have to be bound at render time rather
// than read out of the form: the id, because the whole list shares one form and
// a per-card button would otherwise sweep up every ticked checkbox; and the
// decision, because React reserves a submit button's name/value to encode which
// function a formAction refers to and silently drops whatever was there. Same
// action underneath, same guards, same audit trail.
export async function ruleOneSubmission(
  id: string,
  decision: string,
  formData: FormData
): Promise<void> {
  await applyRuling(/^[0-9a-f-]{36}$/i.test(id) ? [id] : [], decision, formData);
}

async function applyRuling(
  ids: string[],
  decision: string,
  formData: FormData
): Promise<void> {
  const admin = await requireRole('admin');

  const authorId = String(formData.get('authorId') ?? '');
  const back = /^[0-9a-f-]{36}$/i.test(authorId) ? `/admin/contributors/${authorId}` : '/admin';

  if (ids.length === 0 || !['accept', 'reject', 'verify'].includes(decision)) {
    redirect(`${back}?ruled=0`);
  }

  const now = new Date();
  let changed = 0;

  for (const id of ids) {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    if (!submission) continue;

    if (decision === 'verify') {
      // Verification is the second tier and stays honest: only peer-accepted
      // work can be verified, and only once.
      if (submission.status !== 'accepted' || submission.verifiedAt) continue;
      await db
        .update(submissions)
        .set({ verifiedAt: now, verifiedBy: admin.id, updatedAt: now })
        .where(eq(submissions.id, id));
      changed++;
      continue;
    }

    const status = decision === 'accept' ? 'accepted' : 'rejected';
    if (submission.status === status) continue;

    // Reputation follows the transition, not the verdict. An item pushed
    // accepted → rejected → accepted must not pay the author twice, and one
    // overturned out of accepted should give the points back.
    const wasAccepted = submission.status === 'accepted';
    const nowAccepted = status === 'accepted';

    await db
      .update(submissions)
      .set({
        status,
        updatedAt: now,
        // An overturned item cannot stay verified; a release would ship it.
        ...(wasAccepted && !nowAccepted ? { verifiedAt: null, verifiedBy: null } : {}),
      })
      .where(eq(submissions.id, id));

    if (nowAccepted && !wasAccepted) await bump(submission.userId, REP_ACCEPTED_SUBMISSION);
    if (wasAccepted && !nowAccepted) await bump(submission.userId, -REP_ACCEPTED_SUBMISSION);

    changed++;
  }

  await audit(admin.id, `admin.ruled_${decision}`, 'submission', undefined, {
    count: changed,
    requested: ids.length,
    author: authorId,
  });

  revalidatePath(back);
  redirect(`${back}?ruled=${changed}&decision=${decision}`);
}

// Correcting a submission instead of discarding it.
//
// Rejection is the wrong tool for a fixable problem. It throws away work
// somebody chose to give, and it teaches them not to bother again — expensive
// at any size, and unaffordable at a corpus of a few hundred sentences. A
// reviewer can now fix the text and keep the contribution.
//
// Three rules this enforces so "fixing" never becomes "quietly rewriting":
//
//   1. The previous text is preserved in submission_revisions before the new
//      text is written. Nothing an author wrote is ever destroyed.
//   2. Authorship does not move. submissions.userId still points at the
//      contributor; the editor is recorded on the revision, not on the work.
//   3. Editing resets an accepted item to pending. Peers approved specific
//      words, and their approval does not automatically transfer to different
//      ones. A reviewer who is sure can accept it again in the same visit.
export async function reviseSubmission(id: string, formData: FormData): Promise<void> {
  const reviewer = await requireRole('reviewer');

  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/admin');

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!submission) redirect('/admin');

  // A reviewer can fix a submission from the contributor's page or from the
  // validate queue, and should land back where they were rather than being
  // thrown into the admin area mid-session.
  const from = String(formData.get('back') ?? '');
  const back = from === 'validate' ? '/validate' : `/admin/contributors/${submission.userId}`;

  const textSo = String(formData.get('textSo') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim() || null;

  // An empty box would blank a contribution, which is a destructive edit
  // wearing a fix's clothing.
  if (!textSo) redirect(`${back}?revised=empty`);
  if (textSo === submission.textSo) redirect(`${back}?revised=same`);

  await db.insert(submissionRevisions).values({
    submissionId: submission.id,
    textSo: submission.textSo,
    textEn: submission.textEn,
    meaningEn: submission.meaningEn,
    editedBy: reviewer.id,
    note,
  });

  await db
    .update(submissions)
    .set({
      textSo,
      charCount: textSo.length,
      // Back to pending: the votes on record were cast on different words.
      // Verification cannot survive an edit either, or a release ships text no
      // linguist has actually read.
      status: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, id));

  // If the item had been accepted, the author's points were for the accepted
  // version. Take them back with the acceptance; they return when it is
  // accepted again.
  if (submission.status === 'accepted') {
    await bump(submission.userId, -REP_ACCEPTED_SUBMISSION);
  }

  await audit(reviewer.id, 'submission.revised', 'submission', id, {
    author: submission.userId,
    was_status: submission.status,
    before_chars: submission.charCount,
    after_chars: textSo.length,
    note,
  });

  revalidatePath(back);
  redirect(`${back}?revised=1`);
}

// ---- Password resets --------------------------------------------------------

// A link lives for two hours. Long enough to send it and have someone act on
// it across a patchy connection, short enough that a link left sitting in a
// chat thread stops being a key to the account fairly quickly.
const RESET_HOURS = 2;

const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Issue a one-time password reset link for another account.
//
// There is no email provider, so this hands the link to the admin and they send
// it however they already talk to the person. Returned to the page rather than
// carried in a redirect URL, so the token never lands in browser history or a
// server log.
export async function createPasswordReset(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const admin = await requireRole('admin');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return 'ERR:no email given';

  const [target] = await db.select().from(users).where(eq(users.email, email));
  if (!target || target.deletedAt) return 'ERR:no account with that email';

  // Any earlier link for this person stops working the moment a new one is
  // issued, so a forwarded old message cannot be used later.
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.userId, target.id), sql`${passwordResets.usedAt} is null`));

  const token = randomBytes(32).toString('hex');
  await db.insert(passwordResets).values({
    userId: target.id,
    tokenHash: hashResetToken(token),
    issuedBy: admin.id,
    // Computed by the database, not by JavaScript. `created_at` defaults to
    // Postgres now(), so a JS Date here puts two different clocks in one row:
    // the column is `timestamp` without a zone, and whether the driver writes
    // UTC or local wall-clock depends on the process TZ. Locally that produced
    // a window of minus one hour — links born already expired — while
    // surviving in production only because Vercel and Neon both run UTC.
    // Deriving it in SQL makes the two columns comparable by construction.
    expiresAt: sql`now() + (${RESET_HOURS} * interval '1 hour')`,
  });

  await audit(admin.id, 'user.reset_issued', 'user', target.id, { email });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://qor.unkad.com';
  return `OK:${target.handle}:${base}/reset/${token}`;
}

// Look up a reset link without consuming it, so the page can tell a good link
// from a dead one before asking anyone to type a password.
export async function findPasswordReset(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  // Liveness is decided in SQL for the same reason it is written there: a
  // `timestamp` column read back into a JS Date is interpreted against the
  // process timezone, so comparing it to `new Date()` is only correct when
  // every machine involved agrees on UTC.
  const [row] = await db
    .select({ reset: passwordResets, handle: users.handle })
    .from(passwordResets)
    .innerJoin(users, eq(passwordResets.userId, users.id))
    .where(
      and(
        eq(passwordResets.tokenHash, hashResetToken(token)),
        sql`${passwordResets.usedAt} is null`,
        sql`${passwordResets.expiresAt} > now()`
      )
    );
  if (!row) return null;
  return { userId: row.reset.userId, handle: row.handle };
}

// Redeem a link and set a new password.
export async function resetPassword(
  token: string,
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const found = await findPasswordReset(token);
  if (!found) return 'errResetInvalid';

  const password = String(formData.get('password') ?? '');
  if (!password) return 'errRequired';
  if (password.length < 8) return 'errPasswordShort';

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(password, 12),
      // Someone who could not get in may have been locked out by failed
      // attempts. Clear that too, or the new password fails on first use.
      failedLogins: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, found.userId));

  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.tokenHash, hashResetToken(token)));

  // Every existing session dies. If the account was reached by someone else,
  // this is the moment that access ends; the owner logs in fresh below.
  await revokeAllSessions(found.userId);
  await audit(found.userId, 'auth.password_reset', 'user', found.userId);

  redirect('/login?reset=1');
}
