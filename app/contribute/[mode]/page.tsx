import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT, sectorLabel } from '@/lib/i18n';
import { nextPromptFor, submitContribution } from '@/lib/actions';
import { openSectorCounts } from '@/lib/stats';
import { prompts } from '@/lib/schema';
import SomaliTextarea from '@/components/SomaliTextarea';
import Editor from '@/components/Editor';
import ClearDraft from '@/components/ClearDraft';

const MODES = ['write', 'translate', 'transcribe'] as const;
type Mode = (typeof MODES)[number];
type Sector = (typeof prompts.sector.enumValues)[number];

const ERROR_KEY = {
  short: 'errShort',
  cap: 'errCap',
  unavailable: 'errUnavailable',
} as const;

type Props = {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ done?: string; error?: string; sector?: string }>;
};

export default async function ContributeModePage({ params, searchParams }: Props) {
  const { mode } = await params;
  const { done, error, sector: rawSector } = await searchParams;
  const errorKey = error && error in ERROR_KEY ? ERROR_KEY[error as keyof typeof ERROR_KEY] : null;

  if (!MODES.includes(mode as Mode)) notFound();

  const user = await requireOnboarded();
  const lang = await getLang();
  const t = makeT(lang);

  // The contributor's chosen sector, validated against the enum. A sector
  // they have exhausted falls back to "all" rather than a dead "no tasks".
  const sectors = await openSectorCounts(user.id, mode as Mode);
  const open = new Set(sectors.map((s) => s.sector));
  const sector =
    rawSector && (prompts.sector.enumValues as readonly string[]).includes(rawSector) && open.has(rawSector as Sector)
      ? (rawSector as Sector)
      : undefined;

  const prompt = await nextPromptFor(user.id, mode as Mode, sector);
  const sectorHref = (s?: Sector) => `/contribute/${mode}${s ? `?sector=${s}` : ''}`;

  const modeTitle =
    mode === 'write' ? t('modeWrite') : mode === 'translate' ? t('modeTranslate') : t('modeTranscribe');

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/contribute">← {t('navContribute')}</Link>
      </p>
      <h1 lang="so">{modeTitle}</h1>

      {done && (
        <>
          <ClearDraft promptId={done} />
          <p className="notice rise">{t('submitted')}</p>
        </>
      )}
      {errorKey && (
        <p className="notice notice-error rise" role="alert">
          {t(errorKey)}
        </p>
      )}

      {/* Sector picker — steer contributions into an industry. Only shown
          when there is a real choice left to make. */}
      {sectors.length > 1 && (
        <nav className="sector-picker" aria-label={t('chooseSector')}>
          <span className="mono muted sector-picker-label">{t('chooseSector')}</span>
          <div className="chip-row">
            <Link
              className={`chip${sector ? ' chip-plain' : ''}`}
              href={sectorHref()}
              aria-current={sector ? undefined : 'true'}
            >
              {t('sectorAll')}
            </Link>
            {sectors.map((s) => (
              <Link
                key={s.sector}
                className={`chip${sector === s.sector ? '' : ' chip-plain'}`}
                href={sectorHref(s.sector)}
                aria-current={sector === s.sector ? 'true' : undefined}
                lang="so"
              >
                {sectorLabel(lang, s.sector)} <span className="tnum">{s.n}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* The prompts are ours; the corpus is theirs. Always offer the exit
          to writing on a topic of their own. */}
      {mode === 'write' && (
        <p className="mono muted" style={{ fontSize: '0.78rem' }}>
          {t('ownTopicNudge')} <Link href="/contribute/free">{t('modeFree')} →</Link>
        </p>
      )}

      {!prompt ? (
        <p className="muted">{t('noTasks')}</p>
      ) : (
        <>
          <div className="card rise">
            <div className="chip-row">
              <span className="chip" lang="so">
                {sectorLabel(lang, prompt.sector)}
              </span>
              <span className="chip chip-plain">{prompt.register}</span>
              <span className="chip chip-plain">{prompt.topic}</span>
            </div>
            {mode === 'translate' && (
              <>
                <p className="mono muted" style={{ margin: 0 }}>
                  {t('translateThis')}
                </p>
                <p className="task-text" lang="en">
                  {prompt.sourceText}
                </p>
              </>
            )}
            {mode === 'transcribe' && (
              <>
                <p className="mono muted" style={{ margin: 0 }}>
                  {t('transcribeThis')}
                </p>
                <p className="task-text" lang="so">
                  {lang === 'so' ? prompt.textSo : prompt.textEn}
                </p>
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
            <input type="hidden" name="mode" value={mode} />
            {sector && <input type="hidden" name="sector" value={sector} />}
            {mode === 'write' ? (
              <Editor
                name="textSo"
                promptId={prompt.id}
                minLength={10}
                labels={{
                  label: t('yourAnswer'),
                  bold: t('editorBold'),
                  italic: t('editorItalic'),
                  heading: t('editorHeading'),
                  quote: t('editorQuote'),
                  list: t('editorList'),
                  preview: t('editorPreview'),
                  write: t('editorWrite'),
                  focus: t('editorFocus'),
                  words: t('editorWords'),
                  chars: t('chars'),
                  draftRestored: t('draftRestored'),
                }}
              />
            ) : (
              <>
                <SomaliTextarea
                  id="textSo"
                  name="textSo"
                  label={t('yourAnswer')}
                  charsLabel={t('chars')}
                  minLength={10}
                />
                <p className="hint">{t('minLength')}</p>
              </>
            )}
            <div className="btn-row" style={{ maxWidth: '26rem' }}>
              <button className="btn" type="submit">
                {t('submit')}
              </button>
              <Link className="btn btn-quiet" href={sectorHref(sector)}>
                {t('skip')}
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
