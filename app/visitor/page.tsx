// Visitor mode: contribute and set goals with no account details.
// Consent is the single requirement; the row it creates is claimable
// later from /join, so nothing done as a guest is ever lost.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import GuestStartForm from '@/components/GuestStartForm';

export const metadata: Metadata = {
  title: 'Start as a visitor',
  robots: { index: false },
};

export default async function VisitorPage() {
  // Someone already in (guest or member) has no use for this page.
  const current = await getCurrentUser();
  if (current) redirect('/home');

  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <h1>{t('guestTitle')}</h1>
      <p className="muted">{t('guestIntro')}</p>

      <GuestStartForm
        labels={{
          consent: t('guestConsentLabel'),
          dialect: t('guestDialectLabel'),
          start: t('guestStart'),
          errors: {
            errConsentRequired: t('errConsentRequired'),
            errRateLimited: t('errRateLimited'),
            errRequired: t('errRequired'),
          },
        }}
      />

      <p className="hint" style={{ marginTop: '1.2rem' }}>
        <Link href="/join">{t('join')}</Link>
      </p>
    </div>
  );
}
