// Public event page and registration form. No account needed. Which event it
// shows comes from lib/events.ts (the next one that has not ended); the copy
// and the form are driven by that config, so a second event is a config entry.

import Link from 'next/link';
import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { currentEvent, registrationOpen, whenLabel } from '@/lib/events';
import EventRegisterForm from '@/components/EventRegisterForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const ev = currentEvent();
  return {
    title: `${ev.title.so} / ${ev.title.en}`,
    description: `${ev.subtitle.en}. ${ev.hosts.map((h) => h.name).join(' and ')}.`,
    alternates: { canonical: '/kulan' },
  };
}

export default async function KulanPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const ev = currentEvent();
  const open = registrationOpen(ev);

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/">&larr; Unkad</Link>
      </p>

      {/* VERIFY SOMALI: strings in lib/i18n.ts and lib/events.ts */}
      <span className="eyebrow" style={{ marginTop: '1.5rem' }}>{t('kulanEyebrow')}</span>
      <h1 lang={lang}>{ev.title[lang]}</h1>
      <p className="muted" lang={lang}>{ev.subtitle[lang]}</p>

      <div className="card">
        <p style={{ margin: 0 }}>
          <strong>{t('kulanWhen')}:</strong> <span className="tnum">{whenLabel(ev, lang)}</span>
        </p>
        <p style={{ margin: '0.4rem 0 0' }}>
          <strong>{t('kulanWhere')}:</strong> Google Meet
        </p>
      </div>

      <h2>{t('kulanHosts')}</h2>
      {ev.hosts.map((h) => (
        <p key={h.name}>
          <strong>{h.name}</strong>
          <br />
          <span lang={lang}>{h.blurb[lang]}</span>
        </p>
      ))}

      <h2>{t('kulanFormTitle')}</h2>
      {open ? (
        <EventRegisterForm
          slug={ev.slug}
          labels={{
            name: t('kulanName'),
            email: t('kulanEmail'),
            question: t('kulanQuestion'),
            submit: t('kulanSubmit'),
            privacy: t('kulanPrivacy'),
            errors: {
              kulanErrName: t('kulanErrName'),
              kulanErrEmail: t('kulanErrEmail'),
              kulanErrQuestion: t('kulanErrQuestion'),
              kulanClosed: t('kulanClosed'),
              errRateLimited: t('errRateLimited'),
            },
          }}
        />
      ) : (
        <p className="notice">{t('kulanClosed')}</p>
      )}
    </div>
  );
}
