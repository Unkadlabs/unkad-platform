// Cookie-session auth backed by the sessions table.
// Email + password for the MVP (no external providers, works anywhere);
// phone OTP is a Phase 2 addition once there's an SMS budget.

import { cookies } from 'next/headers';
import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { sessions, users } from './schema';

const COOKIE = 'unkad_session';
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  handle: string;
  role: 'contributor' | 'reviewer' | 'admin';
  reputation: number;
};

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const [session] = await db.insert(sessions).values({ userId, expiresAt }).returning();
  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) {
    await db.delete(sessions).where(eq(sessions.id, id)).catch(() => {});
  }
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  // Session ids are uuids; ignore malformed cookies.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      handle: users.handle,
      role: users.role,
      reputation: users.reputation,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())));

  return rows[0] ?? null;
}
