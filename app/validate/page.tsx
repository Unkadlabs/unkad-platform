import Link from 'next/link';
import { requireOnboarded, isReviewer } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT, dialectLabel, sectorLabel } from '@/lib/i18n';
import { nextSubmissionToValidate, castValidation } from '@/lib/actions';

export default async function ValidatePage() {
  const user = await requireOnboarded();
  const lang = await getLang();
  const t = makeT(lang);
  const reviewer = isReviewer(user);
  const item = await nextSubmissionToValidate(user.id, reviewer);

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
          {item.submission.status === 'escalated' && reviewer && (
            <p className="notice">{t('escalatedNote')}</p>
          )}

          <div className="card rise">
            <div className="chip-row">
              <span className="chip" lang="so">
                {sectorLabel(lang, item.prompt.sector)}
              </span>
              <span className="chip chip-plain">{item.prompt.register}</span>
              {item.submission.dialect && (
                <span className="chip chip-plain" lang="so">
                  {dialectLabel(lang, item.submission.dialect)}
                </span>
              )}
            </div>
            <p className="mono muted" style={{ margin: 0 }}>
              {item.submission.mode === 'translate' ? t('sourceWas') : t('promptWas')}
            </p>
            <p className="muted" style={{ marginTop: '0.3rem' }}>
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
