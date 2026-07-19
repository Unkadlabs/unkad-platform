import { desc, sql } from 'drizzle-orm';
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
      accepted: sql<number>`count(${submissions.id}) filter (where ${submissions.status} = 'accepted')`,
    })
    .from(users)
    .leftJoin(submissions, sql`${submissions.userId} = ${users.id}`)
    .where(sql`${users.deletedAt} is null`)
    .groupBy(users.id, users.handle, users.reputation)
    .orderBy(desc(users.reputation))
    .limit(20);

  return (
    <div className="container">
      <h1 lang="so">{t('leaderboardTitle')}</h1>
      <p className="muted">{t('leaderboardSub')}</p>

      <div className="table-wrap">
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
            {rows.map((row, i) => (
              <tr key={row.handle + i}>
                <td className="num">{i + 1}</td>
                <td>{row.handle}</td>
                <td className="num">{row.accepted}</td>
                <td className="num">{row.reputation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
