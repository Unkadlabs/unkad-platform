import { desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, submissions } from '@/lib/schema';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import UnugAvatar from '@/components/UnugAvatar';

export default async function LeaderboardPage() {
  const lang = await getLang();
  const t = makeT(lang);

  const rows = await db
    .select({
      id: users.id,
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

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Visual order: 2nd, 1st, 3rd.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="container">
      <h1 lang="so">{t('leaderboardTitle')}</h1>
      <p className="muted">{t('leaderboardSub')}</p>

      <div className="podium">
        {podiumOrder.map((row) => {
          const rank = podium.indexOf(row) + 1;
          return (
            <div key={row.id} className={`podium-spot rank-${rank}`}>
              <UnugAvatar seed={row.id} size={rank === 1 ? 64 : 48} />
              <span className="podium-rank mono">#{rank}</span>
              <span className="podium-name">{row.handle}</span>
              <span className="podium-rep tnum mono">{row.reputation}</span>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
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
              {rest.map((row, i) => (
                <tr key={row.id}>
                  <td className="num">{i + 4}</td>
                  <td>
                    <span className="row-user">
                      <UnugAvatar seed={row.id} size={22} />
                      {row.handle}
                    </span>
                  </td>
                  <td className="num">{row.accepted}</td>
                  <td className="num">{row.reputation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
