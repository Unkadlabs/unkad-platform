// Admin console (English-only internal tool): corpus stats, batch prompt
// upload, source registry, role management, and the audit trail.

import Link from 'next/link';
import { count, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { prompts, submissions, users, sources, auditLog } from '@/lib/schema';
import { requireRole } from '@/lib/auth';
import { addPrompts, addSource, setUserRole, pendingResetRequests } from '@/lib/actions';
import IssueResetLink from '@/components/IssueResetLink';
import ResetQueueRow from '@/components/ResetQueue';
import { emailConfigured } from '@/lib/email';

type Props = {
  searchParams: Promise<{ added?: string; rolechanged?: string; roleerr?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  await requireRole('admin');
  const { added, rolechanged, roleerr } = await searchParams;

  const resetQueue = await pendingResetRequests();

  const [
    [promptCount],
    [userCount],
    statusCounts,
    registerCounts,
    sectorCounts,
    sourceList,
    recentAudit,
  ] = await Promise.all([
    db.select({ n: count() }).from(prompts),
    db.select({ n: count() }).from(users),
    db
      .select({ status: submissions.status, n: count() })
      .from(submissions)
      .groupBy(submissions.status),
    db
      .select({ register: prompts.register, n: count() })
      .from(prompts)
      .groupBy(prompts.register),
    db
      .select({ sector: prompts.sector, n: count() })
      .from(prompts)
      .groupBy(prompts.sector),
    db.select().from(sources).orderBy(desc(sources.createdAt)).limit(10),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(15),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));

  return (
    <div className="container">
      <h1>Admin</h1>
      <p className="mono">
        <Link href="/admin/activity">Activity monitor →</Link>
      </p>

      {added && <p className="notice">Added {added} prompts.</p>}
      {rolechanged && <p className="notice">Role updated.</p>}
      {roleerr && <p className="notice notice-error">No user with that email.</p>}

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

      <span className="eyebrow">Coverage (prompts)</span>
      <div className="chip-row">
        {registerCounts.map((r) => (
          <span key={r.register} className="chip chip-plain">
            {r.register}: {r.n}
          </span>
        ))}
      </div>
      <div className="chip-row">
        {sectorCounts.map((s) => (
          <span key={s.sector} className="chip">
            {s.sector}: {s.n}
          </span>
        ))}
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
          <label htmlFor="sector">Sector</label>
          <select id="sector" name="sector">
            <option value="general">general</option>
            <option value="health">health</option>
            <option value="education">education</option>
            <option value="agriculture">agriculture</option>
            <option value="law">law</option>
            <option value="media">media</option>
            <option value="religion">religion</option>
            <option value="culture">culture</option>
            <option value="technology">technology</option>
          </select>
        </div>
        <div className="mode-grid">
          <div>
            <label htmlFor="topic">Topic</label>
            <input id="topic" name="topic" defaultValue="general" />
          </div>
          <div>
            <label htmlFor="sourceId">Source id (transcribe mode only)</label>
            <input id="sourceId" name="sourceId" placeholder="uuid from source registry" />
          </div>
        </div>
        <div>
          <label htmlFor="batch">
            One prompt per line: somali || english || source-sentence (translate mode only)
          </label>
          <textarea id="batch" name="batch" required />
        </div>
        <button className="btn" type="submit" style={{ maxWidth: '14rem' }}>
          Add prompts
        </button>
      </form>

      <span className="eyebrow">Source registry (transcribe)</span>
      <form className="form form-wide" action={addSource}>
        <div className="mode-grid">
          <div>
            <label htmlFor="title">Title *</label>
            <input id="title" name="title" required />
          </div>
          <div>
            <label htmlFor="license">License *</label>
            <input id="license" name="license" required placeholder="Public domain / CC BY 4.0" />
          </div>
        </div>
        <div className="mode-grid">
          <div>
            <label htmlFor="author">Author</label>
            <input id="author" name="author" />
          </div>
          <div>
            <label htmlFor="year">Year</label>
            <input id="year" name="year" type="number" />
          </div>
        </div>
        <div>
          <label htmlFor="url">URL</label>
          <input id="url" name="url" type="url" />
        </div>
        <div>
          <label htmlFor="notes">Provenance notes</label>
          <input id="notes" name="notes" placeholder="How was the license verified?" />
        </div>
        <button className="btn" type="submit" style={{ maxWidth: '14rem' }}>
          Register source
        </button>
      </form>

      {sourceList.length > 0 && (
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>License</th>
                <th>Id</th>
              </tr>
            </thead>
            <tbody>
              {sourceList.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td className="mono">{s.license}</td>
                  <td className="mono">{s.id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <span className="eyebrow">Reset requests ({resetQueue.length} waiting)</span>
      {resetQueue.length === 0 ? (
        <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
          Nobody is locked out.{' '}
          {emailConfigured()
            ? 'Links are emailed automatically; anything here failed to send and needs a hand.'
            : 'No email provider is configured, so every request lands here to be sent by hand.'}
        </p>
      ) : (
        resetQueue.map((r) => (
          <ResetQueueRow
            key={r.id}
            id={r.id}
            handle={r.handle}
            email={r.email ?? ''}
            asked={r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
          />
        ))
      )}

      <span className="eyebrow">Password reset</span>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
        There is no email provider here, so resets are issued by hand: generate a link and send it
        to the person however you normally reach them. Nobody, including you, can read an existing
        password — a reset is the only way back into an account.
      </p>
      <IssueResetLink />

      <span className="eyebrow">Roles</span>
      <form className="form" action={setUserRole}>
        <div>
          <label htmlFor="roleEmail">User email</label>
          <input id="roleEmail" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="role">Role</label>
          <select id="role" name="role">
            <option value="contributor">contributor</option>
            <option value="reviewer">reviewer (trusted)</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="btn" type="submit">
          Set role
        </button>
      </form>

      <span className="eyebrow">Audit log</span>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {recentAudit.map((entry) => (
              <tr key={entry.id}>
                <td className="mono">{entry.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                <td className="mono">{entry.action}</td>
                <td className="mono muted">{entry.meta ? JSON.stringify(entry.meta).slice(0, 60) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
