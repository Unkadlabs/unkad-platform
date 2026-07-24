// The leaderboard reads as a ledger of the corpus, not a game podium: every
// contributor's accepted sentences are drawn as unug cells, so the list shows
// how much of the corpus each person has actually built. Bar length is the
// rank, which is why there is no podium.

import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { makeT, dialectLabel } from '@/lib/i18n';
import { CORPUS_GOAL, corpusStats, leaderboardRows } from '@/lib/stats';
import UnugAvatar from '@/components/UnugAvatar';
import CellBar from '@/components/CellBar';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const lang = await getLang();
  const t = makeT(lang);

  const [rows, corpus] = await Promise.all([leaderboardRows(25), corpusStats()]);

  const [lead, ...rest] = rows;
  // One scale for everyone, so bars are comparable down the whole list, and
  // it includes pending work so a board with nothing accepted still reads.
  const max = Math.max(1, ...rows.map((r) => r.accepted + r.pending));
  const goalPct = Math.min(100, (corpus.accepted / CORPUS_GOAL) * 100);
  const anyPending = rows.some((r) => r.pending > 0);

  const workLabel = (row: { accepted: number; pending: number }) =>
    `${row.accepted} ${t('accepted')}, ${row.pending} ${t('pending')}`;

  return (
    <div className="container">
      <h1 lang="so">{t('leaderboardTitle')}</h1>
      <p className="muted">{t('leaderboardSub')}</p>

      {/* The corpus everyone on this page is building, and how far it has to go. */}
      <div className="lb-corpus">
        <div className="lb-corpus-figures">
          <span className="lb-corpus-n tnum">{corpus.accepted.toLocaleString()}</span>
          <span className="lb-corpus-label" lang="so">
            {t('statSentences')}
          </span>
          <span className="lb-corpus-sep" aria-hidden="true" />
          <span className="lb-corpus-n tnum">{corpus.contributors.toLocaleString()}</span>
          <span className="lb-corpus-label" lang="so">
            {t('statContributors')}
          </span>
        </div>
        <div
          className="lb-corpus-track"
          role="progressbar"
          aria-valuenow={corpus.accepted}
          aria-valuemin={0}
          aria-valuemax={CORPUS_GOAL}
        >
          <div className="lb-corpus-fill" style={{ width: `${Math.max(0.5, goalPct)}%` }} />
        </div>
        <p className="lb-corpus-goal mono muted">
          {CORPUS_GOAL.toLocaleString()} {t('goalSuffix')}
        </p>
      </div>

      {!lead ? (
        <div className="card lb-empty">
          <p style={{ marginTop: 0 }}>{t('lbEmpty')}</p>
          <Link className="btn" href="/contribute">
            {t('ctaStart')}
          </Link>
        </div>
      ) : (
        <>
          {/* The person carrying the most corpus, at the scale their work deserves. */}
          <div className="lb-lead rise">
            <div className="lb-lead-head">
              <UnugAvatar seed={lead.id} size={56} />
              <div className="lb-lead-id">
                <span className="lb-rank mono">01</span>
                <span className="lb-lead-name">{lead.handle}</span>
                {lead.dialect && (
                  <span className="chip" lang="so">
                    {dialectLabel(lang, lead.dialect)}
                  </span>
                )}
              </div>
            </div>

            <CellBar
              value={lead.accepted}
              ghost={lead.pending}
              max={max}
              cells={36}
              label={workLabel(lead)}
              animate
            />

            <div className="lb-lead-stats mono">
              <span className="tnum">
                <strong>{lead.accepted.toLocaleString()}</strong> {t('accepted')}
              </span>
              {lead.pending > 0 && (
                <span className="tnum muted">
                  {lead.pending.toLocaleString()} {t('pending')}
                </span>
              )}
              <span className="tnum muted">
                {lead.validations.toLocaleString()} {t('validationsDone')}
              </span>
              <span className="tnum muted">
                {lead.chars.toLocaleString()} {t('charsLabel')}
              </span>
            </div>
          </div>

          <ol className="lb-ledger">
            {rest.map((row, i) => (
              <li key={row.id} className="lb-row">
                <span className="lb-rank mono tnum">{String(i + 2).padStart(2, '0')}</span>

                <span className="lb-who">
                  <UnugAvatar seed={row.id} size={26} />
                  <span className="lb-name">{row.handle}</span>
                </span>

                <span className="lb-bar">
                  <CellBar
                    value={row.accepted}
                    ghost={row.pending}
                    max={max}
                    label={workLabel(row)}
                  />
                </span>

                <span className="lb-figures mono">
                  <span className="lb-figure tnum">{row.accepted.toLocaleString()}</span>
                  <span className="lb-figure-sub tnum muted">
                    {row.validations.toLocaleString()} {t('validationsDone')}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {anyPending && (
            <p className="lb-legend">
              <span>
                <i aria-hidden="true" />
                {t('accepted')}
              </span>
              <span className="lb-legend-pending">
                <i aria-hidden="true" />
                {t('lbPendingLegend')}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
