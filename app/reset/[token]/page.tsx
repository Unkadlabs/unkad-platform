// Set a new password from a one-time link.
//
// Public by design: whoever holds the link is being trusted, which is why the
// link is single-use, expires in two hours, and is superseded the moment a new
// one is issued for the same account.
//
// The link is checked before the form renders, so someone arriving with a dead
// link is told so immediately rather than typing a password into a box that was
// never going to work.

import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { findPasswordReset } from '@/lib/actions';
import ResetPasswordForm from '@/components/ResetPasswordForm';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

export default async function ResetPage({ params }: Props) {
  const { token } = await params;
  const lang = await getLang();
  const t = makeT(lang);

  const found = await findPasswordReset(token);

  return (
    <div className="container">
      <h1 lang="so">{t('changePassword')}</h1>

      {!found ? (
        <>
          <p className="notice notice-error" role="alert" lang="so">
            {t('errResetInvalid')}
          </p>
          <p className="muted">
            <Link href="/login" lang="so">
              {t('login')}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="muted">{found.handle}</p>
          <ResetPasswordForm
            token={token}
            labels={{
              newPassword: t('newPassword'),
              hint: t('passwordHint'),
              submit: t('changePassword'),
            }}
          />
        </>
      )}
    </div>
  );
}
