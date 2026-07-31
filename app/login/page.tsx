import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

// Its own title, so it stops competing with the homepage and /join for one
// slot. Somali verbatim from lib/i18n.ts (loginTitle).
export const metadata: Metadata = {
  title: 'Gal Unkad — log in',
  description: 'Log in to Qor Af-Soomaali to write, translate and validate Somali text.',
  alternates: { canonical: 'https://qor.unkad.com/login' },
  // A login form has nothing to offer a search result, but the page should
  // still pass authority to the pages it links to.
  robots: { index: false, follow: true },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/contribute');

  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container">
      <h1>{t('loginTitle')}</h1>
      <AuthForm
        kind="login"
        labels={{
          email: t('email'),
          password: t('password'),
          handle: t('handle'),
          handleHint: t('handleHint'),
          submit: t('login'),
          license: t('licenseNotice'),
          errors: {
            errBadLogin: t('errBadLogin'),
            errRequired: t('errRequired'),
            errLocked: t('errLocked'),
            errRateLimited: t('errRateLimited'),
          },
        }}
      />
      <p style={{ marginTop: '1.5rem' }}>
        {t('noAccount')} <Link href="/join">{t('join')}</Link>
      </p>
      <p className="muted">
        <Link href="/forgot" lang="so">
          {t('forgotPassword')}
        </Link>
      </p>
    </div>
  );
}
