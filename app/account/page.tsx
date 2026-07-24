import { requireUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import UnugAvatar from '@/components/UnugAvatar';

type Props = { searchParams: Promise<{ changed?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const user = await requireUser();
  const { changed } = await searchParams;

  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container">
      <div className="profile-head">
        <UnugAvatar seed={user.id} size={52} />
        <div>
          <h1 style={{ margin: 0 }}>{t('accountTitle')}</h1>
          <p className="mono muted" style={{ margin: '0.3rem 0 0', fontSize: '0.8rem' }}>
            {user.email}
          </p>
        </div>
      </div>

      {changed && <p className="notice rise">{t('passwordChanged')}</p>}

      <span className="eyebrow">{t('changePassword')}</span>
      <ChangePasswordForm
        labels={{
          current: t('currentPassword'),
          next: t('newPassword'),
          hint: t('passwordHint'),
          submit: t('changePassword'),
          errors: {
            errRequired: t('errRequired'),
            errPasswordShort: t('errPasswordShort'),
            errWrongPassword: t('errWrongPassword'),
            errRateLimited: t('errRateLimited'),
          },
        }}
      />
    </div>
  );
}
