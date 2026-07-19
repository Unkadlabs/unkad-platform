import { desc, eq, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, submissions } from '@/lib/schema';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

export default async function LeaderboardPage() {
  const lang = await getLang();
  const t = makeT(lang);

  const rows = await db
    .select({
      handle: users.handle,
      reputation: users.reputation,
      accepted: count(submissions.id),
    })
    .from(users)
    .leftJoin(
      submissions,
      eq(users.id, submissions.userId)
    )
    .where(eq(submissions.status, 'accepted'))
    .groupBy(users.id, users.handle, users.reputation)
    .orderBy(desc(users.reputation))
    .limit(20);

  const allByRep = await db
    .select({ handle: users.handle, reputation: users.reputation })
    .from(users)
    .orderBy(desc(users.reputation))
    .limit(20);

  const acceptedByHandle = new Map(rows.map((r) => [r.handle, r.accepted]));

  return (
    <div className="container">
      <h1 lang="so">{t('leaderboardTitle')}</h1>
      <p className="muted">{t('leaderboardSub')}</p>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('handle')}</th>
            <th className="num">{t('accepted')}</th>
            <th className="num">{t('reputation')}</th>
          </tr>
        </thead>
        <tbody>
          {allByRep.map((row, i) => (
            <tr key={row.handle + i}>
              <td className="num">{i + 1}</td>
              <td>{row.handle}</td>
              <td className="num">{acceptedByHandle.get(row.handle) ?? 0}</td>
              <td className="num">{row.reputation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
