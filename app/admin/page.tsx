import { redirect } from 'next/navigation';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { prompts, submissions, users } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';
import { addPrompts } from '@/lib/actions';

type Props = { searchParams: Promise<{ added?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/');
  const { added } = await searchParams;

  const [[promptCount], [userCount], statusCounts, recentPrompts] = await Promise.all([
    db.select({ n: count() }).from(prompts),
    db.select({ n: count() }).from(users),
    db
      .select({ status: submissions.status, n: count() })
      .from(submissions)
      .groupBy(submissions.status),
    db.select().from(prompts).orderBy(desc(prompts.createdAt)).limit(10),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));

  return (
    <div className="container">
      <h1>Admin</h1>

      {added && <p className="notice">Added {added} prompts.</p>}

      <div className="stats">
        <div className="stat">
          <span className="n">{userCount.n}</span>
          <span className="label">users</span>
        </div>
        <div className="stat">
          <span className="n">{promptCount.n}</span>
          <span className="label">prompts</span>
        </div>
        <div className="stat">
          <span className="n">{byStatus.pending ?? 0}</span>
          <span className="label">pending</span>
        </div>
        <div className="stat">
          <span className="n">{byStatus.escalated ?? 0}</span>
          <span className="label">escalated</span>
        </div>
        <div className="stat">
          <span className="n">{byStatus.accepted ?? 0}</span>
          <span className="label">accepted</span>
        </div>
        <div className="stat">
          <span className="n">{byStatus.rejected ?? 0}</span>
          <span className="label">rejected</span>
        </div>
      </div>

      <span className="eyebrow">Add prompts (batch)</span>
      <form className="form form-wide" action={addPrompts}>
        <div className="mode-grid">
          <div>
            <label htmlFor="mode">Mode</label>
            <select id="mode" name="mode">
              <option value="write">write</option>
              <option value="translate">translate</option>
              <option value="transcribe">transcribe</option>
            </select>
          </div>
          <div>
            <label htmlFor="register">Register</label>
            <select id="register" name="register">
              <option value="conversational">conversational</option>
              <option value="narrative">narrative</option>
              <option value="instructional">instructional</option>
              <option value="formal">formal</option>
              <option value="technical">technical</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="topic">Topic</label>
          <input id="topic" name="topic" defaultValue="general" />
        </div>
        <div>
          <label htmlFor="batch">
            One prompt per line: somali || english || source-text (translate mode only)
          </label>
          <textarea id="batch" name="batch" required />
        </div>
        <button className="btn" type="submit" style={{ maxWidth: '14rem' }}>
          Add prompts
        </button>
      </form>

      <span className="eyebrow">Recent prompts</span>
      <table className="table">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Register</th>
            <th>Prompt</th>
          </tr>
        </thead>
        <tbody>
          {recentPrompts.map((p) => (
            <tr key={p.id}>
              <td className="mono">{p.mode}</td>
              <td className="mono">{p.register}</td>
              <td lang="so">{p.textSo.slice(0, 80)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
