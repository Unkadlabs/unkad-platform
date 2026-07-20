// DB-backed fixed-window rate limiting. Works across serverless
// instances (unlike in-memory maps). Fails open on DB errors — a broken
// limiter should never take the platform down.

import { eq, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from './db';
import { rateLimits } from './schema';

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

// Returns true if the action is allowed, false if over the limit.
export async function allow(key: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    const now = new Date();
    const windowFloor = new Date(now.getTime() - windowSec * 1000);

    const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));

    if (!row || row.windowStart < windowFloor) {
      await db
        .insert(rateLimits)
        .values({ key, windowStart: now, count: 1 })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { windowStart: now, count: 1 },
        });
      return true;
    }

    if (row.count >= limit) return false;

    await db
      .update(rateLimits)
      .set({ count: sql`${rateLimits.count} + 1` })
      .where(eq(rateLimits.key, key));
    return true;
  } catch {
    return true; // fail open
  }
}
