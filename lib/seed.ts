'use server';

// ============================================================================
// Seed set: invited authors writing instruction pairs by hand.
//
// The whole access model is one unguessable token in the URL. That is a
// deliberate trade: a volunteer who has agreed to write 129 items should not
// be asked to create an account first. The token is 32 random bytes, so it is
// not reachable by guessing, and the cost of that choice is that anyone
// holding the link holds the access. So the route is noindex, disallowed in
// robots, rate limited against enumeration, and the token is never written to
// a log or an audit meta field.
// ============================================================================

import { and, asc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { seedInvites, seedItems, auditLog } from './schema';
import { allow, clientIp } from './ratelimit';

export type SeedInvite = typeof seedInvites.$inferSelect;
export type SeedItem = typeof seedItems.$inferSelect;

// Not exported: a 'use server' module may only export async functions.
const SEED_TYPES = ['task', 'refusal', 'control'];

// Wrong-token attempts are cheap for an attacker and expensive for us, so the
// lookup itself is limited per address before it ever reaches the database.
export async function getInvite(token: string): Promise<SeedInvite | null> {
  if (!token || token.length < 20 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const ip = await clientIp();
  if (!(await allow(`seed:lookup:${ip}`, 60, 300))) return null;

  const [row] = await db.select().from(seedInvites).where(eq(seedInvites.token, token));
  if (!row || !row.active) return null;
  return row;
}

export async function getItems(inviteId: string): Promise<SeedItem[]> {
  return db
    .select()
    .from(seedItems)
    .where(eq(seedItems.inviteId, inviteId))
    .orderBy(asc(seedItems.createdAt));
}

// Nobody's writing enters a dataset without them agreeing first. The name is
// theirs to give: a link can be handed out before anyone knows who will take
// it, so this is the moment the person identifies themselves.
export async function recordConsent(token: string, creditName: string): Promise<string | null> {
  const invite = await getInvite(token);
  if (!invite) return 'ERR:not found';
  if (invite.consentAt) return null;

  const name = creditName.trim().slice(0, 80);
  if (name.length < 2) return 'ERR:name needed';

  await db
    .update(seedInvites)
    .set({ consentAt: new Date(), creditName: name })
    .where(eq(seedInvites.id, invite.id));

  await db.insert(auditLog).values({
    action: 'seed.consent',
    entityType: 'seed_invite',
    entityId: invite.id,
    meta: { credited_as: name },
  });

  revalidatePath(`/seed/${token}`);
  return null;
}

type ItemInput = {
  type: string;
  sector: string;
  instruction: string;
  response: string;
  note?: string | null;
};

function clean(s: string): string {
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// Server-side quota enforcement. The client shows counts and disables the
// button, but a cap that only exists in the browser is not a cap.
async function overQuota(invite: SeedInvite, sector: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(seedItems)
    .where(and(eq(seedItems.inviteId, invite.id), eq(seedItems.sector, sector)));
  return (row?.n ?? 0) >= invite.perSector;
}

export async function saveItem(token: string, input: ItemInput): Promise<string | null> {
  const invite = await getInvite(token);
  if (!invite) return 'ERR:not found';
  if (!invite.consentAt) return 'ERR:consent required';

  const ip = await clientIp();
  if (!(await allow(`seed:write:${invite.id}:${ip}`, 200, 3600))) return 'ERR:too fast';

  const instruction = clean(input.instruction ?? '');
  const response = clean(input.response ?? '');
  if (!instruction || !response) return 'ERR:both boxes needed';
  if (instruction.length > 2000 || response.length > 8000) return 'ERR:too long';

  const sectors = invite.sectors.split(',').map((s) => s.trim());
  if (!sectors.includes(input.sector)) return 'ERR:sector not yours';
  if (!SEED_TYPES.includes(input.type)) return 'ERR:bad type';
  if (await overQuota(invite, input.sector)) return `ERR:${input.sector} is already full`;

  // Refs never reuse a number, even after deletions, so a reference to s0007
  // always means the same item.
  const [max] = await db
    .select({ n: sql<number>`coalesce(max(nullif(regexp_replace(${seedItems.ref}, '\\D', '', 'g'), '')::int), 0)` })
    .from(seedItems)
    .where(eq(seedItems.inviteId, invite.id));
  const ref = 's' + String((max?.n ?? 0) + 1).padStart(4, '0');

  await db.insert(seedItems).values({
    inviteId: invite.id,
    ref,
    type: input.type,
    sector: input.sector,
    instruction,
    response,
    note: input.note?.trim() || null,
  });

  await db
    .update(seedInvites)
    .set({ lastSeenAt: new Date() })
    .where(eq(seedInvites.id, invite.id));

  revalidatePath(`/seed/${token}`);
  return null;
}

export async function updateItem(
  token: string,
  id: string,
  input: ItemInput
): Promise<string | null> {
  const invite = await getInvite(token);
  if (!invite) return 'ERR:not found';

  const instruction = clean(input.instruction ?? '');
  const response = clean(input.response ?? '');
  if (!instruction || !response) return 'ERR:both boxes needed';
  if (instruction.length > 2000 || response.length > 8000) return 'ERR:too long';

  const sectors = invite.sectors.split(',').map((s) => s.trim());
  if (!sectors.includes(input.sector)) return 'ERR:sector not yours';

  // Scoped to the invite so one token can never reach another author's work.
  const res = await db
    .update(seedItems)
    .set({
      type: input.type,
      sector: input.sector,
      instruction,
      response,
      note: input.note?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(seedItems.id, id), eq(seedItems.inviteId, invite.id)));

  revalidatePath(`/seed/${token}`);
  return res ? null : 'ERR:not found';
}

export async function deleteItem(token: string, id: string): Promise<string | null> {
  const invite = await getInvite(token);
  if (!invite) return 'ERR:not found';
  await db
    .delete(seedItems)
    .where(and(eq(seedItems.id, id), eq(seedItems.inviteId, invite.id)));
  revalidatePath(`/seed/${token}`);
  return null;
}
