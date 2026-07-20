import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

export default async function JoinPage() {
  const user = await getCurrentUser();
  if (user) redirect('/contribute');

  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container">
      <h1>{t('joinTitle')}</h1>
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
