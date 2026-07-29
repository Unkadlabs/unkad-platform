// Linguist review: batch verification of peer-accepted items.
// Reviewers select items and sign them off in bulk; anything wrong can be
// overturned. Verified items form the official corpus for dataset releases.

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { submissions, users } from '@/lib/schema';
import { requireRole } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT, dialectLabel, sectorLabel } from '@/lib/i18n';
import { verifyBatch, overturnSubmission } from '@/lib/actions';
import UnugAvatar from '@/components/UnugAvatar';
import SelectAll from '@/components/SelectAll';

type Props = { searchParams: Promise<{ verified?: string }> };

export default async function ReviewPage({ searchParams }: Props) {
  await requireRole('reviewer');
  const { verified } = await searchParams;

  const lang = await getLang();
  const t = makeT(lang);

  const queue = await db
    .select({ submission: submissions, author: users })
    .from(submissions)
    .innerJoin(users, eq(submissions.userId, users.id))
    .where(and(eq(submissions.status, 'accepted'), sql`${submissions.verifiedAt} is null`))
    .orderBy(desc(submissions.createdAt))
    .limit(50);

  // Renderings of the same prompt sit together, source shown once above them.
  //
  // Ordered by date alone, five people's translations of one sentence arrive
  // scattered through the queue, and the reviewer meets what feels like the
  // same item again and again all afternoon: it read as "huge duplicates"
  // when nothing was duplicated. Grouped, the repetition becomes what it
  // actually is, a multi-reference set, judged side by side in one look:
  // approve the good renderings, overturn the weak one, move on. Promptless
  // work (free write, proverbs) keeps its own card and the date order.
  const groups: { key: string; sourceEn: string | null; items: typeof queue }[] = [];
  const byPrompt = new Map<string, number>();
  for (const row of queue) {
    const pid = row.submission.promptId;
    if (pid && byPrompt.has(pid)) {
      groups[byPrompt.get(pid)!].items.push(row);
    } else {
      if (pid) byPrompt.set(pid, groups.length);
      groups.push({
        key: pid ?? row.submission.id,
        sourceEn: row.submission.textEn,
        items: [row],
      });
    }
  }

  return (
    <div className="container">
      <h1 lang="so">{t('reviewTitle')}</h1>
      <p className="muted">{t('reviewSub')}</p>

      {verified && (
        <p className="notice">
          {verified} {t('verifiedCount')}
        </p>
      )}

      {queue.length === 0 ? (
        <p className="muted">{t('nothingToReview')}</p>
      ) : (
        <form action={verifyBatch}>
          <div className="review-toolbar">
            <SelectAll label={t('selectAll')} />
            <button className="btn" type="submit">
              {t('verifySelected')}
            </button>
          </div>

          {groups.map((group) => (
            <div key={group.key}>
              {/* The shared source, once, above its renderings. Only shown when
                  there is a real group; a lone item keeps its compact card. */}
              {group.items.length > 1 && group.sourceEn && (
                <p className="mono muted" style={{ margin: '1.1rem 0 0.3rem', fontSize: '0.8rem' }}>
                  {group.items.length} × &ldquo;{group.sourceEn}&rdquo;
                </p>
              )}
              {group.items.map(({ submission, author }) => (
                <div key={submission.id} className="card review-card">
                  <label className="review-pick">
                    <input type="checkbox" name="ids" value={submission.id} />
                    <div className="review-body">
                      <div className="chip-row" style={{ marginBottom: '0.5rem' }}>
                        <span className="chip chip-plain">{submission.mode}</span>
                        {submission.sector && (
                          <span className="chip" lang="so">
                            {sectorLabel(lang, submission.sector)}
                          </span>
                        )}
                        {submission.dialect && (
                          <span className="chip chip-plain" lang="so">
                            {dialectLabel(lang, submission.dialect)}
                          </span>
                        )}
                      </div>
                      <p lang="so" style={{ margin: 0 }}>
                        {submission.textSo}
                      </p>
                      {submission.textEn && group.items.length === 1 && (
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
                        {author.handle}
                      </p>
                    </div>
                  </label>
                  <button
                    className="btn btn-danger review-overturn"
                    formAction={overturnSubmission.bind(null, submission.id)}
                  >
                    {t('overturn')}
                  </button>
                </div>
              ))}
            </div>
          ))}

          <button className="btn" type="submit" style={{ marginTop: '0.5rem' }}>
            {t('verifySelected')}
          </button>
        </form>
      )}
    </div>
  );
}
