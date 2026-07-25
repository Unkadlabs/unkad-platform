// Free write: the contributor brings their own topic. The one prompted-mode
// constraint that carries over is sector — every corpus item must belong to
// one of the nine sectors, chosen here by the writer.

import Link from 'next/link';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT, sectorLabel } from '@/lib/i18n';
import { submitFreeWrite } from '@/lib/actions';
import { prompts } from '@/lib/schema';
import SomaliTextarea from '@/components/SomaliTextarea';

const ERROR_KEY = { short: 'errShort', cap: 'errCap', sector: 'errSector' } as const;

type Props = { searchParams: Promise<{ done?: string; error?: string }> };

export default async function FreeWritePage({ searchParams }: Props) {
  await requireOnboarded();
  const { done, error } = await searchParams;
  const errorKey = error && error in ERROR_KEY ? ERROR_KEY[error as keyof typeof ERROR_KEY] : null;

  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/contribute">← {t('navContribute')}</Link>
      </p>
      <h1 lang="so">{t('modeFree')}</h1>
      <p className="muted" lang="so">
        {t('freeWriteIntro')}
      </p>

      {done && <p className="notice rise">{t('submitted')}</p>}
      {errorKey && (
        <p className="notice notice-error rise" role="alert">
          {t(errorKey)}
        </p>
      )}

      <form className="form form-wide" action={submitFreeWrite}>
        <div className="mode-grid">
          <div>
            <label htmlFor="sector">{t('chooseSector')}</label>
            <select id="sector" name="sector" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {prompts.sector.enumValues.map((s) => (
                <option key={s} value={s} lang="so">
                  {sectorLabel(lang, s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="topic">{t('topicField')}</label>
            <input id="topic" name="topic" maxLength={120} lang="so" />
          </div>
        </div>

        <SomaliTextarea
          id="textSo"
          name="textSo"
          label={t('yourAnswer')}
          charsLabel={t('chars')}
          minLength={10}
        />
        <p className="hint">{t('minLength')}</p>

        <div className="btn-row" style={{ maxWidth: '26rem' }}>
          <button className="btn" type="submit">
            {t('submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
