import Link from 'next/link';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { submitProverb } from '@/lib/actions';
import SomaliTextarea from '@/components/SomaliTextarea';

const ERROR_KEY = { short: 'errShort', cap: 'errCap' } as const;

type Props = { searchParams: Promise<{ done?: string; error?: string }> };

export default async function ProverbPage({ searchParams }: Props) {
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
      <h1 lang="so">{t('modeProverb')}</h1>
      <p className="muted" lang="so">
        {t('proverbIntro')}
      </p>

      {done && <p className="notice rise">{t('submitted')}</p>}
      {errorKey && (
        <p className="notice notice-error rise" role="alert">
          {t(errorKey)}
        </p>
      )}

      <form className="form form-wide" action={submitProverb}>
        <SomaliTextarea
          id="proverb"
          name="proverb"
          label={t('proverbField')}
          charsLabel={t('chars')}
          minLength={5}
        />
        <div>
          <label htmlFor="translation">{t('translationField')}</label>
          <textarea
            id="translation"
            name="translation"
            required
            minLength={5}
            lang="en"
            style={{ minHeight: '5.5rem' }}
          />
        </div>
        <div>
          <label htmlFor="meaning">{t('meaningField')}</label>
          <textarea
            id="meaning"
            name="meaning"
            required
            minLength={10}
            lang="en"
            style={{ minHeight: '5.5rem' }}
          />
        </div>
        <div className="btn-row" style={{ maxWidth: '26rem' }}>
          <button className="btn" type="submit">
            {t('submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
