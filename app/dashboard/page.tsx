import { redirect } from 'next/navigation';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { submissions, validations } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const lang = await getLang();
  const t = makeT(lang);

  const [mine, [validationCount]] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, user.id))
      .orderBy(desc(submissions.createdAt))
      .limit(50),
    db.select({ n: count() }).from(validations).where(eq(validations.userId, user.id)),
  ]);

  const accepted = mine.filter((s) => s.status === 'accepted').length;
  const pending = mine.filter((s) => s.status === 'pending' || s.status === 'escalated').length;
  const rejected = mine.filter((s) => s.status === 'rejected').length;

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
      <h1>{t('dashboardTitle')}</h1>
      <p className="muted">{user.handle}</p>

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
        <div className="stat">
          <span className="n">{user.reputation}</span>
          <span className="label">{t('reputation')}</span>
        </div>
      </div>

      <span className="eyebrow">{t('recentWork')}</span>
      {mine.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <div>
          {mine.map((s) => (
            <div key={s.id} className="card" style={{ padding: '0.85rem 1rem' }}>
              <p style={{ margin: 0 }} lang="so">
                {s.textSo.length > 140 ? s.textSo.slice(0, 140) + '…' : s.textSo}
              </p>
              <p style={{ margin: '0.4rem 0 0' }}>
                <span className={badge(s.status)}>{statusLabel(s.status)}</span>{' '}
                <span className="mono muted">{s.mode}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      {rejected > 0 && (
        <p className="hint">
          {t('rejected')}: {rejected}
        </p>
      )}
    </div>
  );
}
