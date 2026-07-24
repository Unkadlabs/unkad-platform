// Launch-day monitoring (English-only internal tool).
//
// One page to refresh during a campaign: who signed up, what they actually
// wrote, which sectors the incoming corpus covers, who is engaged, and
// whether the pipeline can still turn any of it into a dataset release.
//
// Read-only — every mutating control lives on /admin.

import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import {
  adminActivity,
  contributorActivity,
  pipelineHealth,
  promptSupply,
  recentSubmissions,
  submissionBreakdown,
} from '@/lib/stats';
import Sparkline from '@/components/Sparkline';
import UnugAvatar from '@/components/UnugAvatar';

export const dynamic = 'force-dynamic';

const DAYS = 14;

function when(date: Date | null) {
  if (!date) return '—';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function AdminActivityPage() {
  await requireRole('admin');

  const [activity, breakdown, contributors, recent, health, supply] = await Promise.all([
    adminActivity(DAYS),
    submissionBreakdown(),
    contributorActivity(),
    recentSubmissions(30),
    pipelineHealth(),
    promptSupply(),
  ]);

  const total = (rows: { n: number }[]) => rows.reduce((sum, r) => sum + r.n, 0);
  const totalChars = breakdown.byMode.reduce((sum, r) => sum + r.chars, 0);
  const activeToday = contributors.filter(
    (c) => c.lastSubmissionAt && Date.now() - c.lastSubmissionAt.getTime() < 24 * 60 * 60 * 1000
  ).length;

  // Anything that would silently stall the corpus → dataset pipeline.
  const warnings: string[] = [];
  if (health.reviewers === 0) {
    warnings.push(
      'No reviewers appointed. Nothing can be linguist-verified, and `npm run export` ships verified items only — so no dataset can be released. Appoint reviewers on /admin → Roles.'
    );
  }
  if (health.escalated > 0 && health.reviewers === 0) {
    warnings.push(`${health.escalated} escalated item(s) have nobody who can settle them.`);
  }
  for (const s of supply) {
    if (s.total === 0) {
      warnings.push(
        `No active ${s.mode} prompts — that mode shows "no tasks" to everyone who opens it.`
      );
    } else if (s.exhausted > 0) {
      warnings.push(
        `${s.exhausted} of ${s.onboarded} onboarded contributor(s) have answered all ${s.total} ${s.mode} prompts and now see "no tasks".`
      );
    }
  }
  if (health.pending > 0 && total(activity.validations) === 0) {
    warnings.push(
      `${health.pending} submission(s) are waiting on peer validation and nobody has validated in the last ${DAYS} days. Items need 2 approvals before they count.`
    );
  }

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/admin">← Admin</Link>
      </p>
      <h1>Activity</h1>
      <p className="muted">Live view of contribution, engagement, and corpus coverage.</p>

      {warnings.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <span className="eyebrow">Needs attention</span>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
            {warnings.map((warning) => (
              <li key={warning} style={{ marginBottom: '0.3rem' }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Pipeline: contribution → peer validation → linguist → release --- */}
      <span className="eyebrow">Pipeline to a dataset</span>
      <div className="stats">
        <div className="stat">
          <span className="n">{health.pending}</span>
          <span className="label">awaiting validation</span>
        </div>
        <div className="stat">
          <span className="n">{health.escalated}</span>
          <span className="label">escalated (split vote)</span>
        </div>
        <div className="stat">
          <span className="n">{health.awaitingVerify}</span>
          <span className="label">accepted, unverified</span>
        </div>
        <div className="stat">
          <span className="n">{health.verified}</span>
          <span className="label">linguist-verified</span>
        </div>
        <div className="stat">
          <span className="n">{health.released}</span>
          <span className="label">shipped in a release</span>
        </div>
        <div className="stat">
          <span className="n">{health.reviewers}</span>
          <span className="label">reviewers + admins</span>
        </div>
      </div>

      {/* ---- Daily pulse ---------------------------------------------------- */}
      <span className="eyebrow">Last {DAYS} days</span>
      <div className="mode-grid">
        <div className="card">
          <p className="mono muted" style={{ margin: 0, fontSize: '0.75rem' }}>
            signups · {total(activity.signups)}
          </p>
          <Sparkline data={activity.signups} />
        </div>
        <div className="card">
          <p className="mono muted" style={{ margin: 0, fontSize: '0.75rem' }}>
            submissions · {total(activity.submissions)}
          </p>
          <Sparkline data={activity.submissions} />
        </div>
        <div className="card">
          <p className="mono muted" style={{ margin: 0, fontSize: '0.75rem' }}>
            validations · {total(activity.validations)}
          </p>
          <Sparkline data={activity.validations} />
        </div>
      </div>

      {/* ---- What is coming in ---------------------------------------------- */}
      <span className="eyebrow">Corpus coming in (from submissions, all statuses)</span>
      <p className="muted" style={{ marginTop: 0 }}>
        {totalChars.toLocaleString()} characters across {activeToday} contributor(s) active in the
        last 24h.
      </p>

      <p className="mono muted" style={{ margin: '0.6rem 0 0.2rem', fontSize: '0.72rem' }}>
        by sector
      </p>
      <div className="chip-row">
        {breakdown.bySector.length === 0 ? (
          <span className="muted">No submissions yet.</span>
        ) : (
          breakdown.bySector.map((row) => (
            <span key={row.key} className="chip">
              {row.key}: {row.n}
            </span>
          ))
        )}
      </div>

      <p className="mono muted" style={{ margin: '0.6rem 0 0.2rem', fontSize: '0.72rem' }}>
        by mode
      </p>
      <div className="chip-row">
        {breakdown.byMode.map((row) => (
          <span key={row.key} className="chip chip-plain">
            {row.key}: {row.n} ({row.chars.toLocaleString()} chars)
          </span>
        ))}
      </div>

      <p className="mono muted" style={{ margin: '0.6rem 0 0.2rem', fontSize: '0.72rem' }}>
        by register · by dialect
      </p>
      <div className="chip-row">
        {breakdown.byRegister.map((row) => (
          <span key={`r-${row.key}`} className="chip chip-plain">
            {row.key}: {row.n}
          </span>
        ))}
        {breakdown.byDialect.map((row) => (
          <span key={`d-${row.key}`} className="chip">
            {row.key}: {row.n}
          </span>
        ))}
      </div>

      {/* ---- Prompt supply --------------------------------------------------- */}
      <span className="eyebrow">Prompt supply</span>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Active prompts</th>
              <th>Ceiling per contributor</th>
              <th>Exhausted it</th>
            </tr>
          </thead>
          <tbody>
            {supply.map((row) => (
              <tr key={row.mode}>
                <td className="mono">{row.mode}</td>
                <td className="mono">{row.total}</td>
                <td className="mono muted">{row.total} submissions</td>
                <td className="mono">
                  {row.exhausted} / {row.onboarded}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        A contributor is never shown the same prompt twice, so active prompts per mode is a hard
        per-person ceiling. Proverb mode needs no prompts and has no ceiling.
      </p>

      {/* ---- Engagement ------------------------------------------------------ */}
      <span className="eyebrow">Contributors ({contributors.length})</span>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Who</th>
              <th>Sub</th>
              <th>Acc</th>
              <th>Rej</th>
              <th>Pend</th>
              <th>Val</th>
              <th>Chars</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((contributor) => (
              <tr key={contributor.id}>
                <td>
                  <span className="row-user">
                    <UnugAvatar seed={contributor.id} size={18} />
                    {contributor.handle}
                    {contributor.role !== 'contributor' && (
                      <span className="chip chip-plain" style={{ marginLeft: '0.4rem' }}>
                        {contributor.role}
                      </span>
                    )}
                  </span>
                  <span className="mono muted" style={{ display: 'block', fontSize: '0.7rem' }}>
                    {contributor.dialect ?? 'no dialect'}
                    {contributor.region ? ` · ${contributor.region}` : ''}
                  </span>
                </td>
                <td className="mono">{contributor.submitted}</td>
                <td className="mono">{contributor.accepted}</td>
                <td className="mono">{contributor.rejected}</td>
                <td className="mono">{contributor.pending}</td>
                <td className="mono">{contributor.validations}</td>
                <td className="mono muted">{contributor.chars.toLocaleString()}</td>
                <td className="mono muted">{when(contributor.lastSubmissionAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- The actual text ------------------------------------------------- */}
      <span className="eyebrow">Latest submissions</span>
      {recent.length === 0 ? (
        <p className="muted">Nothing submitted yet.</p>
      ) : (
        recent.map(({ submission, author }) => (
          <div key={submission.id} className="card">
            <div className="chip-row" style={{ marginBottom: '0.4rem' }}>
              <span className="chip chip-plain">{submission.mode}</span>
              {submission.sector && <span className="chip">{submission.sector}</span>}
              <span className="chip chip-plain">{submission.status}</span>
              {submission.verifiedAt && <span className="chip">verified</span>}
            </div>
            <p lang="so" style={{ margin: 0 }}>
              {submission.textSo}
            </p>
            {submission.textEn && (
              <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.92rem' }}>
                {submission.textEn}
              </p>
            )}
            {submission.meaningEn && (
              <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.92rem' }}>
                {submission.meaningEn}
              </p>
            )}
            <p className="row-user mono muted" style={{ margin: '0.6rem 0 0', fontSize: '0.72rem' }}>
              <UnugAvatar seed={author.id} size={18} />
              {author.handle} · {submission.charCount} chars · {when(submission.createdAt)}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
