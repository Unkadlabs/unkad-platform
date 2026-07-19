import Link from 'next/link';
import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { submissions, users } from '@/lib/schema';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import UnkadMark from '@/components/UnkadMark';

export default async function LandingPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const user = await getCurrentUser();

  const [[acceptedCount], [pendingCount], [contributorCount]] = await Promise.all([
    db.select({ n: count() }).from(submissions).where(eq(submissions.status, 'accepted')),
    db.select({ n: count() }).from(submissions).where(eq(submissions.status, 'pending')),
    db.select({ n: count() }).from(users),
  ]);

  return (
    <div className="container">
      <div style={{ paddingTop: '1.25rem' }}>
        <UnkadMark size={44} className="hero-mark" />
        {/* VERIFY SOMALI: campaign name and all Somali copy */}
        <h1 style={{ fontSize: '2.2rem', marginTop: '1rem' }} lang="so">
          {t('heroTitle')}
        </h1>
        <p style={{ fontSize: '1.2rem' }}>{t('heroSub')}</p>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="n">{acceptedCount.n.toLocaleString()}</span>
          <span className="label">{t('statSentences')}</span>
        </div>
        <div className="stat">
          <span className="n">{contributorCount.n.toLocaleString()}</span>
          <span className="label">{t('statContributors')}</span>
        </div>
        <div className="stat">
          <span className="n">{pendingCount.n.toLocaleString()}</span>
          <span className="label">{t('statPending')}</span>
        </div>
      </div>

      <div className="btn-row" style={{ maxWidth: '26rem' }}>
        <Link className="btn" href={user ? '/contribute' : '/join'}>
          {t('ctaStart')}
        </Link>
      </div>

      <span className="eyebrow">{t('ctaHow')}</span>
      <div className="mode-grid">
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {t('modeWrite')}
            </span>
            {lang === 'so' ? '' : ' · Write'}
          </span>
          <p>{t('modeWriteDesc')}</p>
        </div>
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {t('modeTranslate')}
            </span>
            {lang === 'so' ? '' : ' · Translate'}
          </span>
          <p>{t('modeTranslateDesc')}</p>
        </div>
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {t('modeTranscribe')}
            </span>
            {lang === 'so' ? '' : ' · Transcribe'}
          </span>
          <p>{t('modeTranscribeDesc')}</p>
        </div>
        <div className="mode-card">
          <span className="mode-name">
            <span className="so" lang="so">
              {t('modeValidate')}
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
