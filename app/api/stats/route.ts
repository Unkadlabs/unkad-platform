// Public corpus stats — consumed by unkad.com's live counter and open
// to anyone who wants to embed the campaign's progress. No auth, no
// personal data, cached at the edge for a minute.
//
// `contributors` means people who have submitted or validated something. It
// used to mean signups, which overstated participation on every public surface
// that reads this endpoint. `registered` is the signup count, kept so the
// number is still available under a name that is true.

import { NextResponse } from 'next/server';
import { corpusStats, CORPUS_GOAL } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await corpusStats();
  return NextResponse.json(
    { ...stats, goal: CORPUS_GOAL },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
