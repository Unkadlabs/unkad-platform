import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { CORPUS_GOAL, corpusStats } from '@/lib/stats';
import UnkadMark from '@/components/UnkadMark';

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user && user.consentAt && user.onboardingCompletedAt) redirect('/home');

  const lang = await getLang();
  const t = makeT(lang);
  // Pinned to Somali: the mode names sit inside `lang="so"` and are glossed in
  // English beside them, so `t` produced "Write · Write" for English readers.
  const so = makeT('so');
  const corpus = await corpusStats();
  const pct = Math.min(100, (corpus.accepted / CORPUS_GOAL) * 100);

  return (
    <div className="container">
      <div className="landing-hero">
        <UnkadMark size={52} className="hero-mark" animated />
        {/* VERIFY SOMALI: campaign name and all Somali copy */}
        <h1 className="landing-title" lang="so">
          {t('heroTitle')}
        </h1>
        <p className="landing-sub">{t('heroSub')}</p>
        <div className="btn-row" style={{ maxWidth: '24rem' }}>
          <Link className="btn" href="/join">
            {t('ctaStart')}
          </Link>
          <Link className="btn btn-quiet" href="/login">
            {t('login')}
          </Link>
        </div>
        <p className="hint" style={{ marginTop: '0.8rem' }}>
          <Link href="/visitor">{t('guestCta')}</Link>
        </p>
      </div>

      <div className="card progress-card">
        <div className="progress-head">
          <span className="eyebrow" style={{ margin: 0 }}>
            {t('corpusProgress')}
          </span>
          <span className="mono tnum">
            {corpus.accepted.toLocaleString()} / {CORPUS_GOAL.toLocaleString()}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={corpus.accepted}
          aria-valuemin={0}
          aria-valuemax={CORPUS_GOAL}
        >
          <div className="progress-fill" style={{ width: `${Math.max(0.75, pct)}%` }} />
        </div>
        <p className="hint tnum">
          {pct.toFixed(1)}% · {t('goalSuffix')}
        </p>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="n">{corpus.accepted.toLocaleString()}</span>
          <span className="label">{t('statSentences')}</span>
        </div>
        <div className="stat">
          <span className="n">{corpus.contributors.toLocaleString()}</span>
          <span className="label">{t('statContributors')}</span>
        </div>
        <div className="stat">
          <span className="n">{corpus.pending.toLocaleString()}</span>
          <span className="label">{t('statPending')}</span>
        </div>
      </div>

      <span className="eyebrow">{t('ctaHow')}</span>
      <div className="mode-grid">
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {so('modeWrite')}
            </span>
            {lang === 'so' ? '' : ' · Write'}
          </span>
          <p>{t('modeWriteDesc')}</p>
        </div>
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {so('modeTranslate')}
            </span>
            {lang === 'so' ? '' : ' · Translate'}
          </span>
          <p>{t('modeTranslateDesc')}</p>
        </div>
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {so('modeTranscribe')}
            </span>
            {lang === 'so' ? '' : ' · Transcribe'}
          </span>
          <p>{t('modeTranscribeDesc')}</p>
        </div>
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {so('modeValidate')}
            </span>
            {lang === 'so' ? '' : ' · Validate'}
          </span>
          <p>{t('modeValidateDesc')}</p>
        </div>
      </div>

      <p className="hint" style={{ marginTop: '2rem' }}>
        {t('licenseNotice')}
      </p>
    </div>
  );
}
