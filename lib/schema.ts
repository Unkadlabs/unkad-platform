// ============================================================================
// Unkad Platform — database schema (v2)
//
// Design goals:
//  - Provenance-complete: every corpus item traces to a contributor, prompt,
//    dialect, validation history, license, and (eventually) a dataset release.
//  - Consent-first: contribution is impossible before explicit license
//    consent; credit preference is the contributor's choice, snapshotted.
//  - Auditable: admin/reviewer actions land in an append-only audit log.
//  - Sustainable: migrations are generated + committed (drizzle/), not pushed
//    ad hoc; soft deletes preserve corpus integrity.
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ---- Enums -----------------------------------------------------------------

export const roleEnum = pgEnum('role', ['contributor', 'reviewer', 'admin']);
export const modeEnum = pgEnum('mode', ['write', 'translate', 'transcribe', 'proverb']);
export const registerEnum = pgEnum('register', [
  'conversational',
  'narrative',
  'instructional',
  'formal',
  'technical',
]);
export const statusEnum = pgEnum('status', ['pending', 'accepted', 'rejected', 'escalated']);
export const verdictEnum = pgEnum('verdict', ['approve', 'reject']);
export const dialectEnum = pgEnum('dialect', ['maxaa_tiri', 'maay', 'both', 'other']);
export const creditEnum = pgEnum('credit_choice', ['handle', 'real_name', 'anonymous']);
// The sectors from the platform concept note — corpus coverage targets.
export const sectorEnum = pgEnum('sector', [
  'health',
  'education',
  'agriculture',
  'law',
  'media',
  'religion',
  'culture',
  'technology',
  'general',
]);

// ---- Users & auth ----------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    handle: text('handle').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('contributor'),
    reputation: integer('reputation').notNull().default(0),

    // Profile (onboarding step 2) — dialect is core corpus metadata.
    dialect: dialectEnum('dialect'),
    region: text('region'),
    country: text('country'),

    // Consent (onboarding step 3) — nothing can be contributed before this.
    consentAt: timestamp('consent_at'),
    creditChoice: creditEnum('credit_choice'),
    // Real name for dataset credits when creditChoice = 'real_name'.
    creditName: text('credit_name'),
    onboardingCompletedAt: timestamp('onboarding_completed_at'),

    // Encouragement mail. A daily routine that reminds dormant contributors
    // the platform is still here, and asks people to keep their address current
    // so they can be told what the corpus does with their work.
    //
    // Three columns rather than one, because "did we email them" is not the
    // question that keeps a sending domain alive. The questions are whether
    // they still want it, when they last heard from us, and how many times we
    // have asked without an answer. A mailer that cannot answer all three
    // eventually mails someone for the fortieth time and takes the domain down
    // with it, and every password reset rides that same domain.
    emailOptOutAt: timestamp('email_opt_out_at'),
    lastNudgeAt: timestamp('last_nudge_at'),
    nudgeCount: integer('nudge_count').notNull().default(0),
    // Capability token for one-click unsubscribe. Random per user and minted on
    // first send, so the link works without a session: someone who has stopped
    // using the platform is exactly the person least able to log in first, and
    // an unsubscribe you have to log in to use is not an unsubscribe.
    unsubToken: text('unsub_token'),
    // Set when the provider reports the address is undeliverable. A hard bounce
    // that keeps being retried is what convinces Gmail the sender is careless.
    emailBouncedAt: timestamp('email_bounced_at'),

    // Provenance resolution. The admin profile flags accounts whose text
    // arrived faster than anyone types, which is a real signal and a poor
    // accusation: a writer pasting their own drafts looks identical to a
    // script. Recording the judgement here does two things the flag alone
    // cannot. It stops reviewers working under a warning nobody ever answered,
    // and it puts the licence on record before the text ships in a release,
    // which is the question the timing was never able to settle.
    //
    // Nulls mean undecided, not innocent. The flag keeps showing until someone
    // with a name writes down what they concluded and how they know.
    provenanceClearedAt: timestamp('provenance_cleared_at'),
    provenanceClearedBy: uuid('provenance_cleared_by'),
    // Free text, required when clearing: where the work came from and on what
    // terms it may be published. A release is not defensible because a flag was
    // dismissed; it is defensible because of what is written here.
    provenanceNote: text('provenance_note'),

    // Security.
    failedLogins: integer('failed_logins').notNull().default(0),
    lockedUntil: timestamp('locked_until'),
    emailVerifiedAt: timestamp('email_verified_at'), // reserved for Phase 2

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // soft delete — corpus rows survive
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)]
);

// Sessions store only a SHA-256 hash of the bearer token; the raw token
// lives exclusively in the contributor's httpOnly cookie.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_idx').on(t.userId),
  ]
);

// ---- Password resets -------------------------------------------------------

// One-time links that let someone set a new password.
//
// There is no email provider here and adding one would be the first paid
// dependency, so a self-serve "email me a link" flow is not available. Instead
// an admin generates a link and sends it however they already talk to the
// person, which in practice is WhatsApp. That is the right shape for this
// audience anyway: contributors reach the platform through a phone, not an
// inbox they check.
//
// Same discipline as sessions: only a SHA-256 hash of the token is stored, so
// a database leak cannot be replayed into account takeovers. Single use and
// short-lived, because a link sitting in a chat thread is a standing key to an
// account until one of those two things stops it.
export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),

    // Who issued it. A reset is a privileged act on someone else's account and
    // should never be anonymous in the record.
    issuedBy: uuid('issued_by')
      .notNull()
      .references(() => users.id),

    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('password_resets_token_hash_unique').on(t.tokenHash),
    index('password_resets_user_idx').on(t.userId),
  ]
);

// ---- Password reset requests -----------------------------------------------

// Someone asking for help getting back into their account.
//
// Without this, a locked-out contributor has to find a founder on Facebook and
// hope the message is seen. That is not a recoverable state for most people and
// it is how a reviewer gets lost permanently. A request lands here instead, and
// an admin fulfils it from the queue on /admin.
//
// A row is only written when the email matches a real account, and the public
// form says the same thing either way, so the form cannot be used to test which
// addresses are registered here.
//
// This survives the arrival of an email provider. When one exists the request
// is fulfilled automatically instead of by hand, and the queue becomes the
// record of what happened rather than the work.
export const passwordResetRequests = pgTable(
  'password_reset_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Set once an admin has issued a link, or once one was emailed
    // automatically. Unfulfilled rows are the queue.
    fulfilledAt: timestamp('fulfilled_at'),
    fulfilledBy: uuid('fulfilled_by').references(() => users.id),
    // True when the link went out by email without anyone touching it.
    autoSent: boolean('auto_sent').notNull().default(false),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('password_reset_requests_pending_idx').on(t.fulfilledAt, t.createdAt)]
);

// ---- Source registry (transcribe mode) -------------------------------------

// Only verified public-domain / openly licensed sources may be transcribed.
export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  author: text('author'),
  year: integer('year'),
  license: text('license').notNull(), // e.g. "Public domain", "CC BY 4.0"
  url: text('url'),
  notes: text('notes'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---- Prompts ---------------------------------------------------------------

export const prompts = pgTable(
  'prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mode: modeEnum('mode').notNull(),
    register: registerEnum('register').notNull(),
    sector: sectorEnum('sector').notNull().default('general'),
    topic: text('topic').notNull(),
    textSo: text('text_so').notNull(),
    textEn: text('text_en').notNull(),
    // translate mode: the English sentence to translate.
    sourceText: text('source_text'),
    // transcribe mode: the registered source being digitized.
    sourceId: uuid('source_id').references(() => sources.id),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('prompts_mode_active_idx').on(t.mode, t.active)]
);

// ---- Submissions -----------------------------------------------------------

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promptId: uuid('prompt_id').references(() => prompts.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    mode: modeEnum('mode').notNull(),
    textSo: text('text_so').notNull(),
    textEn: text('text_en'),
    // Proverb mode: the meaning/usage explanation in English.
    meaningEn: text('meaning_en'),
    // Free writes (no prompt): the topic the contributor stated themselves.
    // Prompted submissions leave this null — their topic lives on the prompt.
    topic: text('topic'),
    // Provenance snapshots taken at submission time.
    dialect: dialectEnum('dialect'),
    sector: sectorEnum('sector'),
    charCount: integer('char_count').notNull().default(0),
    status: statusEnum('status').notNull().default('pending'),
    license: text('license').notNull().default('CC-BY-SA-4.0'),
    // Linguist sign-off (second tier, after peer acceptance).
    verifiedAt: timestamp('verified_at'),
    verifiedBy: uuid('verified_by').references(() => users.id),
    // Set when the item ships in a public dataset release.
    releaseId: uuid('release_id').references(() => releases.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('submissions_status_idx').on(t.status),
    index('submissions_user_idx').on(t.userId),
    index('submissions_mode_status_idx').on(t.mode, t.status),
  ]
);

// ---- Submission revisions --------------------------------------------------

// Every superseded version of a submission's text.
//
// Rejecting a contribution over a fixable problem throws away someone's work
// and teaches them not to come back. A reviewer can instead correct it, and
// this table keeps what was there before, so nothing is lost and the change is
// answerable: who edited it, when, and why.
//
// The current text always lives on `submissions`. Each row here is what the
// text looked like *before* one particular edit, so replaying them oldest-first
// reconstructs the contribution from the author's original words onward.
//
// `submissions.userId` never changes. The contributor is the author of the
// contribution whether or not a reviewer later fixed a spelling in it, and the
// dataset credits them. What the dataset must also carry is that an edit
// happened, which is why this is a table and not an in-place overwrite.
export const submissionRevisions = pgTable(
  'submission_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),

    // The superseded text.
    textSo: text('text_so').notNull(),
    textEn: text('text_en'),
    meaningEn: text('meaning_en'),

    // Who replaced it, and why. The note is shown to the contributor, so it is
    // written for them rather than as an internal log line.
    editedBy: uuid('edited_by')
      .notNull()
      .references(() => users.id),
    note: text('note'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('submission_revisions_submission_idx').on(t.submissionId)]
);

// ---- Validations -----------------------------------------------------------

export const validations = pgTable(
  'validations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    verdict: verdictEnum('verdict').notNull(),
    // Set true when cast by a reviewer/admin settling an escalation.
    isReviewerVote: boolean('is_reviewer_vote').notNull().default(false),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('validations_unique_voter').on(t.submissionId, t.userId),
    index('validations_submission_idx').on(t.submissionId),
  ]
);

// ---- Dataset releases ------------------------------------------------------

export const releases = pgTable('releases', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: text('version').notNull(), // e.g. "v0.1.0"
  notes: text('notes'),
  itemCount: integer('item_count').notNull().default(0),
  hfUrl: text('hf_url'), // Hugging Face dataset URL once published
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---- Rate limiting ---------------------------------------------------------

// Fixed-window counters keyed by action+principal (ip or user id).
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start').notNull(),
  count: integer('count').notNull().default(1),
});

// ---- Audit log -------------------------------------------------------------

// Append-only record of privileged actions (prompt uploads, role changes,
// escalation settlements, releases). Never deleted.
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(), // e.g. "prompts.batch_add"
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('audit_actor_idx').on(t.actorId), index('audit_action_idx').on(t.action)]
);
