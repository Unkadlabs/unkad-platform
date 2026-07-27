// Public "I cannot get in" page.
//
// With an email provider configured this sends the link directly. Without one
// the request lands in the admin queue and a person sends it by hand. The
// contributor sees the same thing either way, and in both cases they are told
// something is happening rather than being left to find a founder on Facebook.

import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ForgotPage() {
  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container">
      <h1 lang="so">{t('forgotTitle')}</h1>
      <p className="muted" lang="so">
        {t('forgotIntro')}
      </p>

      <ForgotPasswordForm
        labels={{
          email: t('email'),
          submit: t('forgotTitle'),
          done: t('resetRequested'),
          error: t('errRequired'),
        }}
      />

      <p className="muted" style={{ marginTop: '1.2rem' }}>
        <Link href="/login" lang="so">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
