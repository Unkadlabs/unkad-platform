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

type Props = { searchParams: Promise<{ by?: string; who?: string }> };

// The contributor-table segments. Each answers one admin question directly so
// nobody has to scroll a hundred rows to find, say, everyone whose work is
// stuck in validation. Predicates over the already-loaded rows, not extra
// queries.
const SEGMENTS = {
  all: { label: 'all', test: () => true },
  pending: {
    label: 'has pending',
    test: (c: { pending: number }) => c.pending > 0,
  },
  unverified: {
    label: 'awaiting verify',
    test: (c: { accepted: number; verified: number }) => c.accepted > c.verified,
  },
  clear: {
    label: 'all clear',
    test: (c: { submitted: number; pending: number; accepted: number; verified: number }) =>
      c.submitted > 0 && c.pending === 0 && c.accepted === c.verified,
  },
  quiet: {
    label: 'never wrote',
    test: (c: { submitted: number }) => c.submitted === 0,
  },
  idle: {
    label: 'idle 7d+',
    test: (c: { submitted: number; lastSubmissionAt: Date | null }) =>
      c.submitted > 0 &&
      c.lastSubmissionAt !== null &&
      Date.now() - c.lastSubmissionAt.getTime() > 7 * 24 * 60 * 60 * 1000,
  },
} as const;
type SegmentKey = keyof typeof SEGMENTS;

function when(date: Date | null) {
  if (!date) return '—';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function AdminActivityPage({ searchParams }: Props) {
  await requireRole('admin');
  const { by, who } = await searchParams;
  const filterBy = by && /^[0-9a-f-]{36}$/i.test(by) ? by : undefined;
  const segment: SegmentKey = who && who in SEGMENTS ? (who as SegmentKey) : 'all';

  const [activity, breakdown, contributors, recent, health, supply] = await Promise.all([
    adminActivity(DAYS),
    submissionBreakdown(),
    // High limit on purpose: the default 100 is ordered by output, so the
    // segments that exist to find the quiet people (never wrote, idle) would
    // silently lose exactly the rows they are for.
    contributorActivity(1000),
    recentSubmissions(30, filterBy),
    pipelineHealth(),
    promptSupply(),
  ]);

  const filtered = filterBy ? contributors.find((c) => c.id === filterBy) : undefined;

  // The active segment, sorted by what the admin came to act on: the deepest
  // validation backlog first, or the largest unverified pile first. Other
  // segments keep the by-output order the table has always had.
  const rows = contributors
    .filter(SEGMENTS[segment].test)
    .sort((a, b) => {
      if (segment === 'pending') return b.pending - a.pending;
      if (segment === 'unverified') return (b.accepted - b.verified) - (a.accepted - a.verified);
      return 0;
    });

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
      <span className="eyebrow">
        Contributors ({rows.length}
        {segment === 'all' ? '' : ` of ${contributors.length}`})
      </span>

      {/* Segment chips. Plain links so every view has a URL — an admin can
          bookmark "has pending" or paste it into a message. The `by` feed
          filter below survives the switch. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0 0.8rem' }}>
        {(Object.keys(SEGMENTS) as SegmentKey[]).map((key) => {
          const n = contributors.filter(SEGMENTS[key].test).length;
          const href = `?who=${key}${filterBy ? `&by=${filterBy}` : ''}`;
          return (
            <Link
              key={key}
              href={href}
              className={key === segment ? 'chip' : 'chip chip-plain'}
              style={{ textDecoration: 'none' }}
            >
              {SEGMENTS[key].label} · {n}
            </Link>
          );
        })}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Who</th>
              <th>Sub</th>
              <th>Acc</th>
              <th>Ver</th>
              <th>Rej</th>
              <th>Pend</th>
              <th>Val</th>
              <th>Chars</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((contributor) => (
              <tr key={contributor.id}>
                <td>
                  <Link
                    href={`/admin/contributors/${contributor.id}`}
                    className="row-user"
                    style={{ color: 'inherit' }}
                  >
                    <UnugAvatar seed={contributor.id} size={18} />
                    {contributor.handle}
                    {contributor.role !== 'contributor' && (
                      <span className="chip chip-plain" style={{ marginLeft: '0.4rem' }}>
                        {contributor.role}
                      </span>
                    )}
                  </Link>
                  <span className="mono muted" style={{ display: 'block', fontSize: '0.7rem' }}>
                    {contributor.dialect ?? 'no dialect'}
                    {contributor.region ? ` · ${contributor.region}` : ''}
                  </span>
                </td>
                <td className="mono">{contributor.submitted}</td>
                <td className="mono">{contributor.accepted}</td>
                <td className="mono">{contributor.verified}</td>
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

      {/* ---- The actual text -------------------------------------------------
          Filterable by author. Unfiltered, one prolific contributor can fill
          the whole feed and hide everyone else: 42 of the first 183 submissions
          came from a single account. A plain GET form, so the filtered view has
          its own URL and can be linked or reloaded. */}
      <span className="eyebrow">
        Latest submissions{filtered ? ` — ${filtered.handle}` : ''}
      </span>

      <form method="get" className="review-toolbar" style={{ marginBottom: '0.8rem' }}>
        <label htmlFor="by" className="mono muted" style={{ fontSize: '0.78rem' }}>
          author
        </label>
        {/* Keyed on the filter so React remounts it when the URL changes. A
            select is uncontrolled, so on a client-side navigation it keeps
            whatever the user last picked: after hitting "clear" the feed showed
            everyone while the dropdown still displayed one contributor. */}
        <select
          key={filterBy ?? 'all'}
          id="by"
          name="by"
          defaultValue={filterBy ?? ''}
          style={{ maxWidth: '18rem' }}
        >
          <option value="">everyone</option>
          {contributors
            .filter((c) => c.submitted > 0)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.handle} ({c.submitted})
              </option>
            ))}
        </select>
        <button className="btn btn-quiet" type="submit">
          Show
        </button>
        {filterBy && (
          <Link href="/admin/activity" className="mono muted" style={{ fontSize: '0.78rem' }}>
            clear
          </Link>
        )}
      </form>

      {filtered && (
        <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          Showing the {recent.length} most recent of {filtered.submitted} from {filtered.handle}.{' '}
          <Link href={`/admin/contributors/${filtered.id}`}>Full profile and rulings →</Link>
        </p>
      )}

      {recent.length === 0 ? (
        <p className="muted">
          {filterBy ? 'Nothing from that contributor.' : 'Nothing submitted yet.'}
        </p>
      ) : (
        recent.map(({ submission, author }) => (
          <div key={submission.id} className="card">
            <div className="chip-row" style={{ marginBottom: '0.4rem' }}>
              <span className="chip chip-plain">{submission.mode}</span>
              {submission.sector && <span className="chip">{submission.sector}</span>}
              <span className="chip chip-plain">{submission.status}</span>
              {submission.verifiedAt && <span className="chip">verified</span>}
            </div>
            <p lang="so" className="submission-text">
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
            <p className="mono muted" style={{ margin: '0.6rem 0 0', fontSize: '0.72rem' }}>
              <Link
                href={`/admin/contributors/${author.id}`}
                className="row-user"
                style={{ color: 'inherit' }}
              >
                <UnugAvatar seed={author.id} size={18} />
                {author.handle}
              </Link>{' '}
              · {submission.charCount} chars · {when(submission.createdAt)}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
