import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

// This page carried no metadata, so it inherited the site default and shared a
// title with the homepage and the login page. Three URLs under one title is the
// classic duplicate-title case: a search engine picks one and suppresses the
// rest, and the one it picks is rarely the page you wanted ranked.
//
// It matters most here because every campaign post links straight to /join.
//
// Somali is verbatim from lib/i18n.ts (joinTitle), so nothing unverified ships.
export const metadata: Metadata = {
  title: 'Ku biir Unkad — join the Somali corpus',
  description:
    'Create a free account and start writing Somali. Respond to prompts, translate short English sentences, transcribe openly licensed text, or validate other contributors’ work. Everything you write is released under CC BY-SA 4.0 with the credit you choose.',
  alternates: { canonical: 'https://qor.unkad.com/join' },
};

export default async function JoinPage() {
  const user = await getCurrentUser();
  // Members have nothing to do here, but a guest's path to keeping
  // their work IS this page: the same form claims their existing row.
  if (user && !user.isGuest) redirect('/contribute');

  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container">
      <h1>{t('joinTitle')}</h1>
      {user?.isGuest && <p className="notice">{t('guestNotice')}</p>}
      <AuthForm
        kind="signup"
        labels={{
          email: t('email'),
          password: t('password'),
          handle: t('handle'),
          handleHint: t('handleHint'),
          submit: t('join'),
          license: t('licenseNotice'),
          errors: {
            errEmailTaken: t('errEmailTaken'),
            errRequired: t('errRequired'),
            errRateLimited: t('errRateLimited'),
          },
        }}
      />
      <p style={{ marginTop: '1.5rem' }}>
        {t('haveAccount')} <Link href="/login">{t('login')}</Link>
      </p>
    </div>
  );
}
