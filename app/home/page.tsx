import Link from 'next/link';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import {
  CORPUS_GOAL,
  corpusStats,
  todayCount,
  activityStreak,
  availableTaskCounts,
} from '@/lib/stats';
import { goalProgress } from '@/lib/goals';

export default async function HomePage() {
  const user = await requireOnboarded();
  const lang = await getLang();
  const t = makeT(lang);

  const [corpus, today, streak, available, goal] = await Promise.all([
    corpusStats(),
    todayCount(user.id),
    activityStreak(user.id),
    availableTaskCounts(user.id),
    goalProgress(user.id),
  ]);

  const pct = Math.min(100, (corpus.accepted / CORPUS_GOAL) * 100);

  // Pinned to Somali on purpose. The mode name is rendered inside `lang="so"`
  // and glossed with the English below it, so resolving it through `t` gave an
  // English reader "Write · Write" — and told a screen reader the first one was
  // Somali.
  const so = makeT('so');
  const modes = [
    { href: '/contribute/write', so: so('modeWrite'), en: 'Write', n: available.write },
    { href: '/contribute/translate', so: so('modeTranslate'), en: 'Translate', n: available.translate },
    { href: '/contribute/transcribe', so: so('modeTranscribe'), en: 'Transcribe', n: available.transcribe },
    { href: '/contribute/proverb', so: so('modeProverb'), en: 'Proverb', n: null },
    { href: '/validate', so: so('modeValidate'), en: 'Validate', n: available.validate },
  ];

  return (
    <div className="container">
      <h1 className="greeting">
        <span lang="so">{t('greeting')}</span> {user.handle}
      </h1>
      {today > 0 && <p className="muted">{t('keepGoing')}</p>}

      {user.isGuest && (
        <p className="notice">
          {t('guestNotice')} <Link href="/join">{t('guestJoinCta')}</Link>
        </p>
      )}

      <div className="stats">
        <div className="stat">
          <span className="n">{today}</span>
          <span className="label">{t('todayLabel')}</span>
        </div>
        <div className="stat">
          <span className="n">{streak}</span>
          <span className="label">{t('streakLabel')}</span>
        </div>
        <div className="stat">
          <span className="n">{user.reputation}</span>
          <span className="label">{t('reputation')}</span>
        </div>
      </div>

      {goal ? (
        <div className="card goal-card rise">
          <div className="progress-head">
            <span className="eyebrow" style={{ margin: 0 }}>
              {t('goalCardTitle')} &middot; {t('goalWeekWindow')}
            </span>
            <Link className="mono" style={{ fontSize: '0.75rem' }} href="/goal">
              {t('goalEdit')}
            </Link>
          </div>

          {goal.goal.weeklyWrite > 0 && (
            <div className="goal-row">
              <span className="mono tnum">
                {goal.wroteThisWeek} / {goal.goal.weeklyWrite} {t('goalWritten')}
              </span>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={goal.wroteThisWeek}
                aria-valuemin={0}
                aria-valuemax={goal.goal.weeklyWrite}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(1, (goal.wroteThisWeek / goal.goal.weeklyWrite) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {goal.goal.weeklyValidate > 0 && (
            <div className="goal-row">
              <span className="mono tnum">
                {goal.validatedThisWeek} / {goal.goal.weeklyValidate} {t('goalValidated')}
              </span>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={goal.validatedThisWeek}
                aria-valuemin={0}
                aria-valuemax={goal.goal.weeklyValidate}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(1, (goal.validatedThisWeek / goal.goal.weeklyValidate) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="hint tnum">
            {goal.daysMissed} {t('goalDaysMissed')} &middot;{' '}
            {(goal.shareOfRemaining * 100).toFixed(3)}% {t('goalShareOf')}
          </p>
        </div>
      ) : (
        <Link className="card goal-card goal-cta rise" href="/goal">
          <span className="eyebrow" style={{ margin: 0 }}>
            {t('goalSetCta')}
          </span>
          <p className="hint" style={{ margin: '0.4rem 0 0' }}>
            {t('goalSetHint')}
          </p>
        </Link>
      )}

      <div className="card progress-card rise">
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

      <div className="mode-grid">
        {modes.map((mode) => (
          <Link key={mode.href} className="mode-card" href={mode.href}>
            <span className="mode-name">
              <span className="so" lang="so">
                {mode.so}
              </span>
              {lang === 'so' ? '' : ` · ${mode.en}`}
            </span>
            <p className="tnum">
              {mode.n === null ? t('alwaysOpen') : `${mode.n.toLocaleString()} ${t('tasksAvailable')}`}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
