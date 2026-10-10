// The calendar file for an event: /kulan/event.ics?e=<slug>&lang=so|en.
// Public and read-only. Defaults to the current event and the visitor's
// language cookie.

import { getLang } from '@/lib/lang';
import { buildIcs, currentEvent, getEvent, icsFilename, type Lang } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ev = getEvent(url.searchParams.get('e')) ?? currentEvent();
  const q = url.searchParams.get('lang');
  const lang: Lang = q === 'en' || q === 'so' ? q : await getLang();

  return new Response(buildIcs(ev, lang), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${icsFilename(ev)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
