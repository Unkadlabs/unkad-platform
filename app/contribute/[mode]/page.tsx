import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { nextPromptFor, submitContribution } from '@/lib/actions';

const MODES = ['write', 'translate', 'transcribe'] as const;
type Mode = (typeof MODES)[number];

type Props = {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ done?: string }>;
};

export default async function ContributeModePage({ params, searchParams }: Props) {
  const { mode } = await params;
  const { done } = await searchParams;

  if (!MODES.includes(mode as Mode)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const lang = await getLang();
  const t = makeT(lang);
  const prompt = await nextPromptFor(user.id, mode as Mode);

  const modeTitle =
    mode === 'write' ? t('modeWrite') : mode === 'translate' ? t('modeTranslate') : t('modeTranscribe');

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/contribute">← {t('navContribute')}</Link>
      </p>
      <h1 lang="so">{modeTitle}</h1>

      {done && <p className="notice">{t('submitted')}</p>}

      {!prompt ? (
        <p className="muted">{t('noTasks')}</p>
      ) : (
        <>
          <div className="card">
            {mode === 'translate' && (
              <>
                <p className="mono muted" style={{ marginBottom: '0.5rem' }}>
                  {t('translateThis')}
                </p>
                <p className="task-text" lang="en">
                  {prompt.sourceText}
                </p>
              </>
            )}
            {mode === 'transcribe' && (
              <>
                <p className="mono muted" style={{ marginBottom: '0.5rem' }}>
                  {t('transcribeThis')}
                </p>
                <p className="task-text" lang="so">
                  {lang === 'so' ? prompt.textSo : prompt.textEn}
                </p>
                {prompt.sourceRef && <p className="hint">{prompt.sourceRef}</p>}
              </>
            )}
            {mode === 'write' && (
              <p className="task-text" lang="so">
                {lang === 'so' ? prompt.textSo : prompt.textEn}
              </p>
            )}
          </div>

          <form className="form form-wide" action={submitContribution}>
            <input type="hidden" name="promptId" value={prompt.id} />
            <div>
              <label htmlFor="textSo">{t('yourAnswer')}</label>
              <textarea id="textSo" name="textSo" required minLength={10} lang="so" />
              <p className="hint">{t('minLength')}</p>
            </div>
            <div className="btn-row" style={{ maxWidth: '26rem' }}>
              <button className="btn" type="submit">
                {t('submit')}
              </button>
              <Link className="btn btn-quiet" href={`/contribute/${mode}`}>
                {t('skip')}
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
