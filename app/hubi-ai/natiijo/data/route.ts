// Live Hubi AI-ga room results as JSON, polled every few seconds by
// /hubi-ai/natiijo. Public and read-only: aggregates only (a player count and
// per-item counts), never session ids or rows. One query per request, and a
// few seconds of edge caching so a crowd of viewers costs the database the
// same as one.
//
//   ?since=2026-10-14T17:15:00Z   window start (default: the last 60 minutes)
//   ?all=1                        all-time totals instead

import { NextResponse, type NextRequest } from 'next/server';
import { hubiLive, resolveWindow } from '@/lib/hubi-live';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const data = await hubiLive(resolveWindow({ since: p.get('since'), all: p.get('all') }));
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=5' },
  });
}
