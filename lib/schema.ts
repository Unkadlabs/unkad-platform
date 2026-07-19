// Database schema — the single database of record.
// Every corpus item carries provenance: mode, contributor, validation
// history, and license, per the platform concept note.

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  // Public display name; contributors may choose a pseudonym.
  handle: text('handle').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('contributor'),
  reputation: integer('reputation').notNull().default(0),
  // Credit contributors by name in dataset releases unless they opt out.
  creditOptOut: boolean('credit_opt_out').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const prompts = pgTable(
  'prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mode: modeEnum('mode').notNull(),
    register: registerEnum('register').notNull(),
    topic: text('topic').notNull(),
    // The prompt shown to contributors, in Somali (English fallback).
    textSo: text('text_so').notNull(),
    textEn: text('text_en').notNull(),
    // For translate mode: the English source sentence to translate.
    sourceText: text('source_text'),
    // For transcribe mode: reference to the public-domain source.
    sourceRef: text('source_ref'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('prompts_mode_active_idx').on(t.mode, t.active)]
);

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
    // The contributed Somali text.
    textSo: text('text_so').notNull(),
    // For translate mode: the English source it translates.
    textEn: text('text_en'),
    status: statusEnum('status').notNull().default('pending'),
    license: text('license').notNull().default('CC-BY-SA-4.0'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('submissions_status_idx').on(t.status),
    index('submissions_user_idx').on(t.userId),
  ]
);

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
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    // One vote per person per submission.
    uniqueIndex('validations_unique_voter').on(t.submissionId, t.userId),
  ]
);
