// ============================================================================
// Auth & authorization (v2)
//
//  - Bearer tokens: 32 random bytes; only the SHA-256 hash is stored.
//  - Sessions: 30-day expiry, revocable, user-agent recorded.
//  - Lockout: 5 failed logins locks the account for 15 minutes.
//  - Guards: requireUser / requireOnboarded / requireRole for pages+actions.
// ============================================================================

import { createHash, randomBytes } from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from './db';
import { sessions, users } from './schema';

const COOKIE = 'unkad_session';
const SESSION_DAYS = 30;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export type CurrentUser = {
  id: string;
  email: string | null;
  handle: string;
  isGuest: boolean;
  role: 'contributor' | 'reviewer' | 'admin';
  reputation: number;
  dialect: 'maxaa_tiri' | 'maay' | 'both' | 'other' | null;
  region: string | null;
  country: string | null;
  consentAt: Date | null;
  creditChoice: 'handle' | 'real_name' | 'anonymous' | null;
  onboardingCompletedAt: Date | null;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const ua = (await headers()).get('user-agent')?.slice(0, 250) ?? null;

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    userAgent: ua,
    expiresAt,
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)))
      .catch(() => {});
  }
  jar.delete(COOKIE);
}

// Revoke every session for a user (e.g. after a password change).
export async function revokeAllSessions(userId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token || token.length < 32) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      handle: users.handle,
      isGuest: users.isGuest,
      role: users.role,
      reputation: users.reputation,
      dialect: users.dialect,
      region: users.region,
      country: users.country,
      consentAt: users.consentAt,
      creditChoice: users.creditChoice,
      onboardingCompletedAt: users.onboardingCompletedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(sessions.revokedAt),
        isNull(users.deletedAt)
      )
    );

  return rows[0] ?? null;
}

// ---- Guards ----------------------------------------------------------------

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

// Contribution requires completed onboarding (profile + consent).
export async function requireOnboarded(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.consentAt || !user.onboardingCompletedAt) redirect('/onboarding');
  return user;
}

const ROLE_RANK = { contributor: 0, reviewer: 1, admin: 2 } as const;

export async function requireRole(minimum: 'reviewer' | 'admin'): Promise<CurrentUser> {
  const user = await requireUser();
  if (ROLE_RANK[user.role] < ROLE_RANK[minimum]) redirect('/');
  return user;
}

export function isReviewer(user: CurrentUser): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK.reviewer;
}
