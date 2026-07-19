import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

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
          },
        }}
      />
      <p style={{ marginTop: '1.5rem' }}>
        {t('noAccount')} <Link href="/join">{t('join')}</Link>
      </p>
    </div>
  );
}
