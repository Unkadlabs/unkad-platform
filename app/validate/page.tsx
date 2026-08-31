import Link from 'next/link';
import { requireOnboarded, isReviewer, isAdmin } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT, dialectLabel, sectorLabel } from '@/lib/i18n';
import { nextSubmissionToValidate, castValidation, reviseSubmission } from '@/lib/actions';

// Times for the admin strip. Absolute so it can be quoted, relative so the
// age of the queue is readable without arithmetic.
function when(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const t = new Date(d);
  const days = Math.floor((Date.now() - t.getTime()) / 86400000);
  const ago = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
  return `${t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${t
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · ${ago}`;
}

export default async function ValidatePage() {
  const user = await requireOnboarded();
  const lang = await getLang();
  const t = makeT(lang);
  const reviewer = isReviewer(user);
  const admin = isAdmin(user);
  const item = await nextSubmissionToValidate(user.id, reviewer, admin);

  const isProverb = item?.submission.mode === 'proverb';

  return (
    <div className="container">
      <p className="mono muted">
        <Link href="/contribute">← {t('navContribute')}</Link>
      </p>
      <h1 lang="so">{t('modeValidate')}</h1>

      {!item ? (
        <p className="muted">{t('nothingToValidate')}</p>
      ) : (
        <>
          {item.submission.status === 'escalated' && reviewer && (
            <p className="notice">{t('escalatedNote')}</p>
          )}

          <div className="card rise">
            <div className="chip-row">
              <span className="chip" lang="so">
                {isProverb
                  ? t('modeProverb')
                  : sectorLabel(lang, item.submission.sector ?? item.prompt?.sector ?? null)}
              </span>
              {item.prompt && <span className="chip chip-plain">{item.prompt.register}</span>}
              {item.submission.dialect && (
                <span className="chip chip-plain" lang="so">
                  {dialectLabel(lang, item.submission.dialect)}
                </span>
              )}
            </div>

            {isProverb ? (
              <>
                <p className="task-text" lang="so">
                  {item.submission.textSo}
                </p>
                <hr style={{ margin: '1rem 0' }} />
                <p className="mono muted" style={{ margin: 0 }}>
                  {t('translationField')}
                </p>
                <p style={{ marginTop: '0.3rem' }}>{item.submission.textEn}</p>
                <p className="mono muted" style={{ margin: 0 }}>
                  {t('meaningField')}
                </p>
                <p style={{ marginTop: '0.3rem', marginBottom: 0 }}>
                  {item.submission.meaningEn}
                </p>
              </>
            ) : item.prompt || item.submission.mode === 'translate' ? (
              <>
                <p className="mono muted" style={{ margin: 0 }}>
                  {item.submission.mode === 'translate' ? t('sourceWas') : t('promptWas')}
                </p>
                <p className="muted" style={{ marginTop: '0.3rem' }}>
                  {item.submission.mode === 'translate'
                    ? item.submission.textEn
                    : lang === 'so'
                      ? item.prompt?.textSo
                      : item.prompt?.textEn}
                </p>
                <hr style={{ margin: '1rem 0' }} />
                <p className="task-text" lang="so">
                  {item.submission.textSo}
                </p>
              </>
            ) : (
              // Free write: no prompt — show the contributor's own topic.
              <>
                <p className="mono muted" style={{ margin: 0 }}>
                  {t('freeWriteTag')}
                  {item.submission.topic ? ` — ${item.submission.topic}` : ''}
                </p>
                <hr style={{ margin: '1rem 0' }} />
                <p className="task-text" lang="so">
                  {item.submission.textSo}
                </p>
              </>
            )}
          </div>

          {/* Review apparatus, for reviewers and admins only.
              
              An ordinary validator sees exactly what they saw before: the text,
              the question, two buttons. Showing them the running tally meant
              showing the decisive voter what the first voter had already said,
              at precisely the moment their own vote would settle the item. The
              accept rule assumes two independent judgements; anchoring the
              second one turns two votes into one, and quietly suppresses the
              disagreements that escalation exists to catch.
              
              Reviewers get the tally and the edit history because their job is
              to adjudicate rather than to add an independent voice, and knowing
              how a split arose is the whole point of settling it. */}
          {reviewer && (
            <>
              <p className="mono muted" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
                {item.votes.total === 0
                  ? 'Nobody has reviewed this yet.'
                  : `${item.votes.total} reviewed · ${item.votes.approve} said correct · ${item.votes.reject} said it has problems`}
                {item.revisions.length > 0
                  ? ` · edited ${item.revisions.length} time${item.revisions.length > 1 ? 's' : ''}`
                  : ''}
              </p>

              {/* The author's own words, kept whenever a reviewer changes
                  something, so an edit is always visible next to what it
                  replaced rather than silently standing in for it. */}
              {item.revisions.map((rev, i) => (
                <details key={i} style={{ marginTop: '0.5rem' }}>
                  <summary className="mono muted" style={{ fontSize: '0.72rem', cursor: 'pointer' }}>
                    original, before {rev.editor} edited it
                    {rev.note ? ` — ${rev.note}` : ''}
                  </summary>
                  <p lang="so" className="muted" style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap' }}>
                    {rev.text}
                  </p>
                </details>
              ))}

              <details style={{ marginTop: '0.8rem' }}>
                <summary className="mono muted" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                  fix this text instead of rejecting it
                </summary>
                <form
                  className="form form-wide"
                  action={reviseSubmission.bind(null, item.submission.id)}
                >
                  <input type="hidden" name="back" value="validate" />
                  <textarea
                    name="textSo"
                    defaultValue={item.submission.textSo}
                    rows={Math.min(12, Math.max(3, Math.ceil(item.submission.textSo.length / 70)))}
                    lang="so"
                  />
                  <input name="note" placeholder="what you changed, in a few words" />
                  <button className="btn" type="submit">
                    Save fix
                  </button>
                </form>
              </details>
            </>
          )}

          {/* Admin-only timeline. Answers two questions the tally cannot:
              how old is this queue, and has anybody already looked at this
              one. Withheld from ordinary validators for the same reason the
              tally is — naming the earlier voter anchors the deciding vote. */}
          {admin && (
            <div
              className="mono muted"
              style={{
                marginTop: '0.8rem',
                fontSize: '0.72rem',
                lineHeight: 1.7,
                paddingLeft: '0.7rem',
                borderLeft: '2px solid var(--rule, #2E2C29)',
              }}
            >
              <div>written {when(item.submission.createdAt)}</div>
              {item.history.length === 0 ? (
                <div>no votes yet</div>
              ) : (
                item.history.map((h, i) => (
                  <div key={i}>
                    {h.verdict === 'approve' ? 'correct' : 'has problems'} · {h.handle}
                    {h.reviewerVote ? ' (reviewer)' : ''} · {when(h.at)}
                  </div>
                ))
              )}
              {item.revisions.map((rev, i) => (
                <div key={`r${i}`}>edited · {rev.editor} · {when(rev.at)}</div>
              ))}
            </div>
          )}

          <p style={{ marginTop: '1rem' }}>
            <strong>{t('validateQuestion')}</strong>
          </p>
          <form action={castValidation}>
            <input type="hidden" name="submissionId" value={item.submission.id} />
            <div className="btn-row" style={{ maxWidth: '30rem' }}>
              <button className="btn" type="submit" name="verdict" value="approve">
                {t('approve')}
              </button>
              <button className="btn btn-danger" type="submit" name="verdict" value="reject">
                {t('reject')}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
