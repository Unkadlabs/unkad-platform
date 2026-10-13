// Live room results for Hubi AI-ga, for screen-sharing at an event
// (/hubi-ai/natiijo). Aggregates only: how many sessions answered anything,
// and per item how many judged it and how many judged it correctly. No
// session ids or rows ever leave this function.
//
// Same counting rule as scripts/hubi-funnel.mjs: the first click per session
// per item, so a double click cannot count twice. With a window, only clicks
// at or after `since` are considered.
//
// created_at is `timestamp` without time zone, filled by now() in the
// connection's TimeZone (UTC on Neon, local on a dev machine). Casting the
// bound instant through timestamptz -> timestamp converts it into that same
// zone, so the comparison is right everywhere and can still use the index.

import { sql } from 'drizzle-orm';
import { db } from './db';
import { HUBI_ITEMS } from './hubi-ai';

export type HubiLiveItem = {
  id: string;
  question: string;
  aiRight: boolean;
  n: number;
  ok: number;
};

export type HubiLive = {
  all: boolean;
  since: string | null; // ISO instant, null for all time
  sinceLabel: string | null; // e.g. "20:15 EAT"
  players: number;
  items: HubiLiveItem[];
  fooledId: string | null; // lowest % correct among items with answers
};

const DEFAULT_WINDOW_MS = 60 * 60 * 1000;

// Resolve the query params into a window. A missing or unreadable `since`
// falls back to the last 60 minutes; `all=1` drops the window.
export function resolveWindow(params: { since?: string | null; all?: string | null }): Date | null {
  if (params.all === '1') return null;
  if (params.since) {
    const d = new Date(params.since);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(Date.now() - DEFAULT_WINDOW_MS);
}

function eatLabel(d: Date): string {
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${hm} EAT`;
}

export async function hubiLive(since: Date | null): Promise<HubiLive> {
  const iso = since ? since.toISOString() : null;
  const window = iso
    ? sql`and created_at >= (${iso}::timestamptz)::timestamp`
    : sql``;

  // One query: per-item rows, plus one summary row (item_id null) whose n is
  // the number of distinct sessions with at least one answer.
  const res = await db.execute<{ item_id: string | null; n: number; ok: number }>(sql`
    with a as (
      select distinct on (session, item_id) session, item_id, correct
      from hubi_ai_events
      where kind = 'answer' and item_id is not null ${window}
      order by session, item_id, created_at
    )
    select item_id, count(*)::int as n, (count(*) filter (where correct))::int as ok
    from a group by item_id
    union all
    select null, count(distinct session)::int, 0 from a
  `);

  let players = 0;
  const byId = new Map<string, { n: number; ok: number }>();
  for (const r of res.rows) {
    if (r.item_id === null) players = Number(r.n);
    else byId.set(r.item_id, { n: Number(r.n), ok: Number(r.ok) });
  }

  const items: HubiLiveItem[] = HUBI_ITEMS.map((it) => {
    const x = byId.get(it.id) ?? { n: 0, ok: 0 };
    return { id: it.id, question: it.question, aiRight: it.right, n: x.n, ok: x.ok };
  });

  // Only name a "most fooling" item when there is something to compare: at
  // least two items answered and not all at the same rate. Ties go to the
  // earlier item in the deck.
  let fooledId: string | null = null;
  let low = Infinity;
  let high = -Infinity;
  let answered = 0;
  for (const it of items) {
    if (it.n === 0) continue;
    answered++;
    const p = it.ok / it.n;
    if (p > high) high = p;
    if (p < low) {
      low = p;
      fooledId = it.id;
    }
  }
  if (answered < 2 || low === high) fooledId = null;

  return {
    all: since === null,
    since: iso,
    sinceLabel: since ? eatLabel(since) : null,
    players,
    items,
    fooledId,
  };
}
