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
import ClearDraft from '@/components/ClearDraft';
import SubmitButton from '@/components/SubmitButton';
import { tokenize } from '@/lib/words';

const ERROR_KEY = { short: 'errShort', cap: 'errCap', sector: 'errSector' } as const;

type Props = { searchParams: Promise<{ done?: string; error?: string; erey?: string }> };

export default async function FreeWritePage({ searchParams }: Props) {
  await requireOnboarded();
  const { done, error, erey } = await searchParams;
  // Arriving from a missing word on /ereyada: ask for a sentence that uses it,
  // and pre-fill the topic with the word so the campaign can be counted later.
  // One word, letters only, so the parameter can never carry anything else.
  const word = done ? '' : tokenize((erey ?? '').slice(0, 40))[0] ?? '';
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

      {done && <ClearDraft promptId="free" />}
      {done && <p className="notice rise">{t('submitted')}</p>}
      {errorKey && (
        <p className="notice notice-error rise" role="alert">
          {t(errorKey)}
        </p>
      )}
      {word && (
        <p className="notice rise">
          {t('freeWriteWithWord')}: <strong lang="so">{word}</strong>
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
            <input id="topic" name="topic" maxLength={120} lang="so" defaultValue={word} />
          </div>
        </div>

        <SomaliTextarea
          id="textSo"
          name="textSo"
          label={t('yourAnswer')}
          charsLabel={t('chars')}
          minLength={10}
          draftKey="unkad-draft-free"
          draftRestoredLabel={t('draftRestored')}
          focusLabel={t('editorFocus')}
          doneLabel={t('editorDone')}
        />
        <p className="hint">{t('minLength')}</p>

        <div className="btn-row" style={{ maxWidth: '26rem' }}>
          <SubmitButton label={t('submit')} />
        </div>
      </form>
    </div>
  );
}
