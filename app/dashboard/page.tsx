import Link from 'next/link';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { submissions, validations } from '@/lib/schema';
import { requireUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT, dialectLabel } from '@/lib/i18n';
import { userDailyCounts, userRegisterBreakdown } from '@/lib/stats';
import UnugAvatar from '@/components/UnugAvatar';
import Sparkline from '@/components/Sparkline';

export default async function DashboardPage() {
  const user = await requireUser();
  const lang = await getLang();
  const t = makeT(lang);

  const [mine, [validationCount], daily, registers] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, user.id))
      .orderBy(desc(submissions.createdAt))
      .limit(30),
    db.select({ n: count() }).from(validations).where(eq(validations.userId, user.id)),
    userDailyCounts(user.id, 14),
    userRegisterBreakdown(user.id),
  ]);

  const accepted = mine.filter((s) => s.status === 'accepted').length;
  const pending = mine.filter((s) => s.status === 'pending' || s.status === 'escalated').length;
  const rejected = mine.filter((s) => s.status === 'rejected').length;
  const settled = accepted + rejected;
  const acceptRate = settled > 0 ? Math.round((accepted / settled) * 100) : null;

  const badge = (status: string) =>
    status === 'accepted'
      ? 'badge badge-accepted'
      : status === 'rejected'
        ? 'badge badge-rejected'
        : 'badge';

  const statusLabel = (status: string) =>
    status === 'accepted' ? t('accepted') : status === 'rejected' ? t('rejected') : t('pending');

  return (
    <div className="container">
      <div className="profile-head">
        <UnugAvatar seed={user.id} size={52} />
        <div>
          <h1 style={{ margin: 0 }}>{user.handle}</h1>
          <div className="chip-row" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
            {user.dialect && (
              <span className="chip" lang="so">
                {dialectLabel(lang, user.dialect)}
              </span>
            )}
            {user.region && <span className="chip chip-plain">{user.region}</span>}
            <span className="chip chip-plain tnum">{user.reputation} rep</span>
          </div>
          <p className="mono" style={{ margin: '0.5rem 0 0', fontSize: '0.78rem' }}>
            <Link href="/account">{t('accountTitle')} →</Link>
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="n">{accepted}</span>
          <span className="label">{t('accepted')}</span>
        </div>
        <div className="stat">
          <span className="n">{pending}</span>
          <span className="label">{t('pending')}</span>
        </div>
        <div className="stat">
          <span className="n">{validationCount.n}</span>
          <span className="label">{t('validationsDone')}</span>
        </div>
        {acceptRate !== null && (
          <div className="stat">
            <span className="n">{acceptRate}%</span>
            <span className="label">{t('acceptanceRate')}</span>
          </div>
        )}
      </div>

      <div className="card">
        <span className="eyebrow" style={{ marginTop: 0 }}>
          {t('last14')}
        </span>
        <Sparkline data={daily} />
      </div>

      {registers.length > 0 && (
        <>
          <span className="eyebrow">{t('byRegister')}</span>
          <div className="chip-row">
            {registers.map((r) => (
              <span key={r.register} className="chip chip-plain tnum">
                {r.register}: {r.n}
              </span>
            ))}
          </div>
        </>
      )}

      <span className="eyebrow">{t('recentWork')}</span>
      {mine.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <div>
          {mine.map((s) => (
            <div key={s.id} className="card" style={{ padding: '0.9rem 1.1rem' }}>
              <p style={{ margin: 0 }} lang="so">
                {s.textSo.length > 140 ? s.textSo.slice(0, 140) + '…' : s.textSo}
              </p>
              <p style={{ margin: '0.45rem 0 0' }}>
                <span className={badge(s.status)}>{statusLabel(s.status)}</span>{' '}
                <span className="mono muted">{s.mode}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
