import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { nextSubmissionToValidate, castValidation } from '@/lib/actions';

export default async function ValidatePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const lang = await getLang();
  const t = makeT(lang);
  const isReviewer = user.role === 'reviewer' || user.role === 'admin';
  const item = await nextSubmissionToValidate(user.id, isReviewer);

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/contribute">← {t('navContribute')}</Link>
      </p>
      <h1 lang="so">{t('modeValidate')}</h1>

      {!item ? (
        <p className="muted">{t('nothingToValidate')}</p>
      ) : (
        <>
          <div className="card">
            <p className="mono muted" style={{ marginBottom: '0.5rem' }}>
              {item.submission.mode === 'translate' ? t('sourceWas') : t('promptWas')}
            </p>
            <p className="muted">
              {item.submission.mode === 'translate'
                ? item.submission.textEn
                : lang === 'so'
                  ? item.prompt.textSo
                  : item.prompt.textEn}
            </p>
            <hr style={{ margin: '1rem 0' }} />
            <p className="task-text" lang="so">
              {item.submission.textSo}
            </p>
          </div>

          <p>
            <strong>{t('validateQuestion')}</strong>
          </p>
          <form action={castValidation}>
            <input type="hidden" name="submissionId" value={item.submission.id} />
            <div className="btn-row" style={{ maxWidth: '30rem' }}>
              <button className="btn" type="submit" name="verdict" value="approve">
                {t('approve')}
              </button>
              <button className="btn btn-danger" type="submit" name="verdict" value="reject">
                {t('reject')}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
