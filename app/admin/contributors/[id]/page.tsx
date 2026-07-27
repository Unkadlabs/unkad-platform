// One contributor, in full (English-only internal tool).
//
// The activity table answers "who is contributing". It cannot answer "should I
// trust this", and when a single account holds most of the corpus that is the
// question that decides whether a dataset can ship. So this page is built
// around it: what they wrote, what the corpus looks like without them, and the
// timing evidence for whether the text was composed here or arrived from
// somewhere else.
//
// Read-only. Every mutating control still lives on /admin.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { contributorProfile, revisionsForUser } from '@/lib/stats';
import {
  ruleOnSubmissions,
  ruleOneSubmission,
  reviseSubmission,
  clearProvenance,
  reopenProvenance,
} from '@/lib/actions';
import Sparkline from '@/components/Sparkline';
import UnugAvatar from '@/components/UnugAvatar';
import SelectAll from '@/components/SelectAll';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    ruled?: string;
    decision?: string;
    revised?: string;
    cleared?: string;
    reopened?: string;
    noteerr?: string;
  }>;
};

function when(date: Date | null) {
  if (!date) return '—';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function duration(sec: number | null) {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}h`;
  return `${(sec / 86400).toFixed(1)}d`;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function ContributorPage({ params, searchParams }: Props) {
  await requireRole('admin');
  const { id } = await params;
  // No `cleared` / `reopened` banner: the resolved card either appears or it
  // does not, which says it better than a toast would.
  const { ruled, decision, revised, noteerr } = await searchParams;

  const [profile, revisions] = await Promise.all([contributorProfile(id), revisionsForUser(id)]);
  if (!profile) notFound();

  const {
    user,
    clearedByHandle,
    items,
    rateById,
    totals,
    pace,
    repeatedOpenings,
    bySector,
    byMode,
    byDialect,
    byRegister,
    days,
    perHour,
    votesCast,
    votesReceived,
  } = profile;

  // The banner speaks about the account, so it waits for a pattern. Individual
  // fast rows are still marked in the list below regardless.
  const flagged = pace.isPattern;
  const dominant = totals.shareOfChars >= 0.25;
  const resolved = Boolean(user.provenanceClearedAt);

  const peakHour = perHour.reduce((a, b) => (b.n > a.n ? b : a), perHour[0]);
  const activeHours = perHour.filter((h) => h.n > 0).length;

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/admin/activity">← Activity</Link>
      </p>

      {/* ---- Who ------------------------------------------------------------ */}
      <div className="row-user" style={{ gap: '0.6rem', alignItems: 'center' }}>
        <UnugAvatar seed={user.id} size={40} />
        <div>
          <h1 style={{ margin: 0 }}>{user.handle}</h1>
          <p className="mono muted" style={{ margin: 0, fontSize: '0.75rem' }}>
            {user.email} · joined {user.createdAt.toISOString().slice(0, 10)} ·{' '}
            {user.reputation} rep
          </p>
        </div>
      </div>

      <div className="chip-row" style={{ marginTop: '0.7rem' }}>
        <span className="chip chip-plain">{user.role}</span>
        <span className="chip">{user.dialect ?? 'no dialect'}</span>
        {user.region && <span className="chip chip-plain">{user.region}</span>}
        {user.country && <span className="chip chip-plain">{user.country}</span>}
        <span className="chip chip-plain">
          credit: {user.creditChoice ?? 'unset'}
          {user.creditName ? ` (${user.creditName})` : ''}
        </span>
        <span className="chip chip-plain">
          consent: {user.consentAt ? user.consentAt.toISOString().slice(0, 10) : 'NOT GIVEN'}
        </span>
        {user.deletedAt && <span className="chip">deleted</span>}
      </div>

      {/* ---- Provenance ------------------------------------------------------
          Placed above the totals deliberately. If this account cannot be
          trusted the totals below are not an achievement, they are a liability,
          and the reader should learn that before reading the numbers. */}
      {/* Answered. The evidence stays on the page below, because a clearance
          that hides what it cleared is worth nothing to whoever reads this
          next. What changes is that the account is no longer an open question,
          and the licence is written down. */}
      {resolved && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <span className="eyebrow">Provenance settled</span>
          <p style={{ margin: '0.4rem 0 0' }}>{user.provenanceNote}</p>
          <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85em' }}>
            Recorded by {clearedByHandle ?? 'an admin'} on{' '}
            {user.provenanceClearedAt?.toISOString().slice(0, 10)}
            {flagged && ' · the pace flag below still shows the evidence it was based on'}
          </p>
          <form action={reopenProvenance.bind(null, id)} style={{ marginTop: '0.6rem' }}>
            <button className="btn btn-quiet" type="submit">
              Reopen this question
            </button>
          </form>
        </div>
      )}

      {(flagged || dominant) && !resolved && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <span className="eyebrow">Needs a judgement call</span>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
            {dominant && (
              <li style={{ marginBottom: '0.3rem' }}>
                This account holds <strong>{pct(totals.shareOfChars)}</strong> of every character
                in the corpus and <strong>{pct(totals.shareOfSubs)}</strong> of all submissions.
                Whatever is decided here applies to most of the dataset.
              </li>
            )}
            {flagged && (
              <li style={{ marginBottom: '0.3rem' }}>
                <strong>
                  {pace.implausibleCount} of {Math.max(0, totals.submitted - 1)}
                </strong>{' '}
                submissions ({pct(pace.implausibleShare)}) arrived faster than {pace.threshold}{' '}
                characters per second of composition time, peaking at{' '}
                <strong>{pace.peakCharsPerSec?.toFixed(0)}</strong>. Sustained human typing tops
                out near 10. This text was not typed into the box. Pasting your own offline
                drafting is legitimate, so this proves nothing on its own — what it means is that
                the timing is no evidence of authorship, and where the text came from has to be
                established some other way before it can ship under a licence. Flagged rows are
                marked below.
              </li>
            )}
          </ul>

          {/* Closing it. The note is the point of the control, not paperwork
              attached to it: the flag can only tell you the text was not typed
              here, so the thing that resolves it is someone writing down where
              it did come from and on what terms it can be published. */}
          <form action={clearProvenance.bind(null, id)} style={{ marginTop: '0.9rem' }}>
            <label className="label" htmlFor="prov-note">
              Where did this text come from, and on what terms can it be published?
            </label>
            <textarea
              id="prov-note"
              name="note"
              rows={3}
              required
              minLength={20}
              placeholder="e.g. Known personally. Working tech writer pasting his own published articles, which explains the pace. Granted permission on 27 Jul to publish freely under the corpus licence."
              style={{ width: '100%', marginTop: '0.3rem' }}
            />
            {noteerr && (
              <p className="muted" style={{ margin: '0.3rem 0 0', color: 'var(--danger)' }}>
                Write the actual reason. A clearance with nothing behind it is what this record
                exists to prevent.
              </p>
            )}
            <button className="btn" type="submit" style={{ marginTop: '0.5rem' }}>
              Record this and clear the flag
            </button>
          </form>
        </div>
      )}

      {/* ---- Totals --------------------------------------------------------- */}
      <span className="eyebrow">Contribution</span>
      <div className="stats">
        <div className="stat">
          <span className="n">{totals.submitted}</span>
          <span className="label">submissions</span>
        </div>
        <div className="stat">
          <span className="n">{totals.sentences.toLocaleString()}</span>
          <span className="label">sentences</span>
        </div>
        <div className="stat">
          <span className="n">{totals.chars.toLocaleString()}</span>
          <span className="label">characters</span>
        </div>
        <div className="stat">
          <span className="n">{totals.accepted}</span>
          <span className="label">accepted</span>
        </div>
        <div className="stat">
          <span className="n">{totals.pending}</span>
          <span className="label">pending</span>
        </div>
        <div className="stat">
          <span className="n">{totals.escalated}</span>
          <span className="label">escalated</span>
        </div>
        <div className="stat">
          <span className="n">{totals.rejected}</span>
          <span className="label">rejected</span>
        </div>
        <div className="stat">
          <span className="n">{totals.verified}</span>
          <span className="label">linguist-verified</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
        {pct(totals.shareOfChars)} of the corpus by character, {pct(totals.shareOfSubs)} by
        submission. Sentences are counted the way the campaign milestones are stated: split on
        terminal punctuation and line breaks, keeping lines of at least three words.
      </p>

      {/* ---- Pace ----------------------------------------------------------- */}
      <span className="eyebrow">Pace and composition</span>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            <tr>
              <td>Average submission</td>
              <td className="mono">
                {pace.avgChars.toLocaleString()} chars · {pace.avgSentences.toFixed(1)} sentences
              </td>
            </tr>
            <tr>
              <td>Largest submission</td>
              <td className="mono">{pace.maxChars.toLocaleString()} chars</td>
            </tr>
            <tr>
              <td>Median gap between submissions</td>
              <td className="mono">{duration(pace.medianGapSec)}</td>
            </tr>
            <tr>
              <td>Shortest gap</td>
              <td className="mono">{duration(pace.fastestGapSec)}</td>
            </tr>
            <tr>
              <td>Peak implied composition rate</td>
              <td className="mono">
                {pace.peakCharsPerSec != null ? `${pace.peakCharsPerSec.toFixed(1)} chars/sec` : '—'}
                {flagged && (
                  <span className="muted"> · human ceiling is roughly 10</span>
                )}
              </td>
            </tr>
            <tr>
              <td>Submissions above {pace.threshold} chars/sec</td>
              <td className="mono">
                {pace.implausibleCount} of {Math.max(0, totals.submitted - 1)}
              </td>
            </tr>
            <tr>
              <td>Hours of day used</td>
              <td className="mono">
                {activeHours} of 24 · busiest {String(peakHour.hour).padStart(2, '0')}:00 UTC (
                {peakHour.n})
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Gaps are measured between consecutive submissions, so they are an upper bound on time
        spent writing: a contributor may have been drafting before the previous submission landed.
        The first submission has no predecessor and is excluded.
      </p>

      {repeatedOpenings.length > 0 && (
        <>
          <span className="eyebrow">Repeated openings</span>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            The same first 40 characters appearing across submissions meant to be independent
            pieces. Often a template, sometimes a paste of one long document split into parts.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Times</th>
                </tr>
              </thead>
              <tbody>
                {repeatedOpenings.slice(0, 12).map((row) => (
                  <tr key={row.head}>
                    <td lang="so">{row.head}…</td>
                    <td className="mono">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---- Coverage -------------------------------------------------------- */}
      <span className="eyebrow">Coverage</span>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sector</th>
              <th className="num">Subs</th>
              <th className="num">Sentences</th>
              <th className="num">Chars</th>
            </tr>
          </thead>
          <tbody>
            {bySector.map((row) => (
              <tr key={row.key}>
                <td className="mono">{row.key}</td>
                <td className="mono num">{row.n}</td>
                <td className="mono num">{row.sentences}</td>
                <td className="mono num muted">{row.chars.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mono muted" style={{ margin: '0.8rem 0 0.2rem', fontSize: '0.72rem' }}>
        by mode · by dialect · by register
      </p>
      <div className="chip-row">
        {byMode.map((row) => (
          <span key={`m-${row.key}`} className="chip chip-plain">
            {row.key}: {row.n} ({row.sentences} sent)
          </span>
        ))}
        {byDialect.map((row) => (
          <span key={`d-${row.key}`} className="chip">
            {row.key}: {row.n}
          </span>
        ))}
        {byRegister.map((row) => (
          <span key={`r-${row.key}`} className="chip chip-plain">
            {row.key}: {row.n}
          </span>
        ))}
      </div>

      {/* ---- Rhythm ---------------------------------------------------------- */}
      <span className="eyebrow">Rhythm</span>
      <div className="mode-grid">
        <div className="card">
          <p className="mono muted" style={{ margin: 0, fontSize: '0.75rem' }}>
            submissions per active day · {days.length} day(s)
          </p>
          <Sparkline data={days} />
        </div>
        <div className="card">
          <p className="mono muted" style={{ margin: 0, fontSize: '0.75rem' }}>
            hour of day (UTC)
          </p>
          <Sparkline
            data={perHour.map((h) => ({ day: String(h.hour), n: h.n }))}
            width={24 * 12}
          />
        </div>
      </div>

      {/* ---- How they judge, how they were judged ---------------------------- */}
      <span className="eyebrow">Peer review</span>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th className="num">Approve</th>
              <th className="num">Reject</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Votes they cast on others</td>
              <td className="mono num">{votesCast.approve}</td>
              <td className="mono num">{votesCast.reject}</td>
              <td className="mono num">{votesCast.total}</td>
            </tr>
            <tr>
              <td>Votes received on their work</td>
              <td className="mono num">{votesReceived.approve}</td>
              <td className="mono num">{votesReceived.reject}</td>
              <td className="mono num">{votesReceived.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {votesCast.total > 0 && votesCast.reject === 0 && (
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Approved all {votesCast.total} items they reviewed and rejected none. Worth a look before
          their votes are treated as independent validation.
        </p>
      )}

      {/* ---- Everything they wrote, and the rulings --------------------------
          One form wraps the whole list. The toolbar buttons submit every ticked
          row; the per-card buttons use formAction to rule on that row alone, so
          reading and deciding never means leaving the page. */}
      <span className="eyebrow">All {items.length} submission(s), newest first</span>

      {ruled != null && (
        <div className="notice">
          {Number(ruled) === 0
            ? 'Nothing changed — those items were already in that state.'
            : `${ruled} submission(s) ${decision === 'verify' ? 'verified' : `${decision}ed`}.`}
        </div>
      )}

      {revised != null && (
        <div className="notice">
          {revised === 'empty'
            ? 'Not saved: the text was empty. Blanking a contribution is a deletion, not a fix.'
            : revised === 'same'
              ? 'Not saved: the text was unchanged.'
              : 'Fixed. The previous wording is kept below, and the item is back in the queue.'}
        </div>
      )}

      {items.length === 0 ? (
        <p className="muted">Nothing submitted.</p>
      ) : (
        <form action={ruleOnSubmissions.bind(null, 'accept')}>
          <input type="hidden" name="authorId" value={user.id} />

          <div className="review-toolbar">
            <SelectAll label="select all" />
            <button className="btn" formAction={ruleOnSubmissions.bind(null, 'accept')}>
              Accept selected
            </button>
            <button className="btn btn-quiet" formAction={ruleOnSubmissions.bind(null, 'verify')}>
              Verify selected
            </button>
            <button className="btn btn-danger" formAction={ruleOnSubmissions.bind(null, 'reject')}>
              Reject selected
            </button>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            An admin ruling overrides peer validation rather than joining it, and every ruling is
            written to the audit log. Verify only applies to items already accepted, since
            releases ship verified work. Rejecting an accepted item also clears its verification,
            so nothing overturned can still reach a release.
          </p>

          {items.map((item) => {
            const rate = rateById.get(item.id);
            const suspect = pace.implausibleIds.has(item.id);
            return (
              <div
                key={item.id}
                className="card"
                style={suspect ? { borderColor: 'var(--danger)' } : undefined}
              >
                <div className="chip-row" style={{ marginBottom: '0.4rem' }}>
                  <label className="checkline mono" style={{ fontSize: '0.78rem', margin: 0 }}>
                    <input type="checkbox" name="ids" value={item.id} />
                    <span className="muted">pick</span>
                  </label>
                  <span className="chip chip-plain">{item.mode}</span>
                  {item.sector && <span className="chip">{item.sector}</span>}
                  <span className="chip chip-plain">{item.status}</span>
                  {item.verifiedAt && <span className="chip">verified</span>}
                  <span className="chip chip-plain">{item.sentences} sent</span>
                  {suspect && (
                    <span className="chip">{rate?.charsPerSec?.toFixed(0)} chars/sec</span>
                  )}
                </div>

                {(item.promptTopic || item.promptSource || item.topic) && (
                  <p className="mono muted" style={{ margin: '0 0 0.4rem', fontSize: '0.72rem' }}>
                    {item.promptSource
                      ? `source: ${item.promptSource}`
                      : `topic: ${item.promptTopic ?? item.topic}`}
                  </p>
                )}

                <p lang="so" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {item.textSo}
                </p>
                {item.textEn && (
                  <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.92rem' }}>
                    {item.textEn}
                  </p>
                )}
                {item.meaningEn && (
                  <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.92rem' }}>
                    {item.meaningEn}
                  </p>
                )}

                <p className="mono muted" style={{ margin: '0.6rem 0 0.5rem', fontSize: '0.72rem' }}>
                  {item.charCount.toLocaleString()} chars · {when(item.createdAt)}
                  {rate?.gapSec != null && ` · ${duration(rate.gapSec)} after the previous one`}
                </p>

                {/* What this text used to say. Shown above the fix box so a
                    reviewer about to edit can see whether someone already has,
                    and so an edit can never be silent. */}
                {(revisions.get(item.id) ?? []).map((rev, ri) => (
                  <div
                    key={`${item.id}-rev-${ri}`}
                    style={{
                      borderLeft: '2px solid var(--rule)',
                      paddingLeft: '0.7rem',
                      margin: '0.6rem 0',
                    }}
                  >
                    <p className="mono muted" style={{ margin: 0, fontSize: '0.7rem' }}>
                      was, until {rev.editor} edited it {when(rev.at)}
                      {rev.note ? ` · ${rev.note}` : ''}
                    </p>
                    <p
                      lang="so"
                      className="muted"
                      style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap', fontSize: '0.92rem' }}
                    >
                      {rev.text}
                    </p>
                  </div>
                ))}

                {/* Fix rather than reject. At a few hundred sentences, discarding
                    a contribution over a fixable problem costs more than the
                    problem does. */}
                <details style={{ margin: '0.6rem 0' }}>
                  <summary className="mono muted" style={{ fontSize: '0.72rem', cursor: 'pointer' }}>
                    fix this text
                  </summary>
                  <div className="form form-wide" style={{ marginTop: '0.6rem' }}>
                    <textarea
                      name="textSo"
                      form={`fix-${item.id}`}
                      defaultValue={item.textSo}
                      rows={Math.min(14, Math.max(3, Math.ceil(item.textSo.length / 70)))}
                      lang="so"
                    />
                    <input
                      name="note"
                      form={`fix-${item.id}`}
                      placeholder="what you changed, in a few words (shown to the contributor)"
                    />
                    <button className="btn" type="submit" form={`fix-${item.id}`}>
                      Save fix
                    </button>
                  </div>
                </details>

                {/* Ruling on one row. The id is bound into the action rather
                    than read from the form, so these never sweep up whatever
                    else happens to be ticked further down the page. */}
                <div className="btn-row">
                  {item.status !== 'accepted' && (
                    <button
                      className="btn"
                      formAction={ruleOneSubmission.bind(null, item.id, 'accept')}
                    >
                      Accept this
                    </button>
                  )}
                  {item.status === 'accepted' && !item.verifiedAt && (
                    <button
                      className="btn btn-quiet"
                      formAction={ruleOneSubmission.bind(null, item.id, 'verify')}
                    >
                      Verify this
                    </button>
                  )}
                  {item.status !== 'rejected' && (
                    <button
                      className="btn btn-danger"
                      formAction={ruleOneSubmission.bind(null, item.id, 'reject')}
                    >
                      Reject this
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </form>
      )}

      {/* One empty form per submission, carrying only the action. They sit
          outside the ruling form because HTML forbids nesting forms; the
          `form` attribute on each textarea, note field and button above ties
          them together. Without this the fix controls would either be illegal
          markup or silently submit as part of a bulk ruling. */}
      {items.map((item) => (
        <form
          key={`fixform-${item.id}`}
          id={`fix-${item.id}`}
          action={reviseSubmission.bind(null, item.id)}
        />
      ))}
    </div>
  );
}
