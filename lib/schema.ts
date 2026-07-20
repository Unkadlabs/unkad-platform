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
export const modeEnum = pgEnum('mode', ['write', 'translate', 'transcribe']);
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
    promptId: uuid('prompt_id')
      .notNull()
      .references(() => prompts.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    mode: modeEnum('mode').notNull(),
    textSo: text('text_so').notNull(),
    textEn: text('text_en'),
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
