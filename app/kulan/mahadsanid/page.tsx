// After registering: the date in EAT, the meeting link, and two ways to put it
// in a calendar. Public; it reveals nothing about who registered.

import Link from 'next/link';
import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { currentEvent, getEvent, googleCalendarUrl, whenLabel } from '@/lib/events';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mahadsanid',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ e?: string }> };

export default async function KulanThanksPage({ searchParams }: Props) {
  const { e } = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);
  const ev = getEvent(e) ?? currentEvent();

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/kulan">&larr; {ev.title[lang]}</Link>
      </p>

      <h1 lang={lang}>{t('kulanThanksTitle')}</h1>
      <p className="muted" lang={lang}>{t('kulanThanksBody')}</p>

      <div className="card">
        <h3 lang={lang}>{ev.title[lang]}</h3>
        <p style={{ margin: 0 }}>
          <strong>{t('kulanWhen')}:</strong> <span className="tnum">{whenLabel(ev, lang)}</span>
        </p>
        <p style={{ margin: '0.4rem 0 0' }}>
          <strong>{t('kulanMeetLink')}:</strong>{' '}
          <a href={ev.meetUrl} rel="noopener noreferrer" target="_blank" className="mono">
            {ev.meetUrl.replace(/^https:\/\//, '')}
          </a>
        </p>
      </div>

      <div className="btn-row">
        <a className="btn" href={googleCalendarUrl(ev, lang)} target="_blank" rel="noopener noreferrer">
          {t('kulanAddGoogle')}
        </a>
        <a
          className="btn btn-quiet"
          href={`/kulan/event.ics?e=${encodeURIComponent(ev.slug)}&lang=${lang}`}
          download
        >
          {t('kulanDownloadIcs')}
        </a>
      </div>
    </div>
  );
}
