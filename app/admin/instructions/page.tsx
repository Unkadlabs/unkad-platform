// The instruction dataset dashboard (English-only internal tool).
//
// The seed set is written by invited authors through /seed/[token]. None of it
// was visible anywhere: four invites were out, two people had never opened
// their link, one had written three items, and the only way to know any of
// that was to run a script. This page is the surface, written so that whoever
// opens it can see the state and know what to do without asking anyone.

import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { instructionState, SECTORS, TASK_TYPES } from '@/lib/instructions';

export default async function InstructionsPage() {
  await requireRole('admin');
  const s = await instructionState();
  const pct = Math.min(100, s.pct);

  const stalled = s.authors.filter((a) => a.active && (!a.consented || a.written === 0));

  return (
    <div className="container">
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/admin">&larr; Admin</Link>
      </p>

      <h1>Instruction dataset</h1>
      <p className="muted">
        {s.goal.toLocaleString()} hand-written instruction pairs to finetune Unug. Each item is an
        instruction, an optional input it acts on, and a response &mdash; written in English first,
        then built in Somali. Authors write through their own <span className="mono">/seed</span>{' '}
        link; this page is where the work is tracked.
      </p>

      {/* ---- Progress ---- */}
      <h2>Where we stand</h2>
      <p style={{ fontSize: '2.2rem', fontWeight: 700, margin: '0.2rem 0' }}>
        {s.total.toLocaleString()}{' '}
        <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}>
          of {s.goal.toLocaleString()} &middot; {s.remaining.toLocaleString()} to go
        </span>
      </p>
      <div
        style={{
          height: 14, background: 'var(--rule, #e8e6e1)', borderRadius: 7,
          overflow: 'hidden', maxWidth: '34rem', marginBottom: '0.5rem',
        }}
      >
        <div style={{ width: `${Math.max(pct, 0.4)}%`, height: '100%', background: 'var(--accent)' }} />
      </div>
      <p className="hint">
        {pct.toFixed(1)}% written. Invites currently out cover {s.quotaTotal.toLocaleString()} items
        of the target.
      </p>

      {/* ---- The blocker, stated plainly ---- */}
      {stalled.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>What is blocking this right now</h3>
          <ul>
            {stalled.map((a) => (
              <li key={a.id}>
                <strong>{a.name ?? 'unnamed invite'}</strong> ({a.sectors}) &mdash;{' '}
                {!a.consented
                  ? 'has never opened their link or agreed to the terms. Nothing can be written until they do.'
                  : 'agreed but has written nothing yet.'}
              </li>
            ))}
          </ul>
          <p className="hint">
            Mint or re-send a link with{' '}
            <span className="mono">npm run seed:new -- --sectors law,religion --label &quot;name&quot;</span>
          </p>
        </div>
      )}

      {/* ---- Authors ---- */}
      <h2>Authors</h2>
      <table>
        <thead>
          <tr>
            <th>Invite</th><th>Sectors</th><th>Written</th><th>Quota</th>
            <th>Consented</th><th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {s.authors.map((a) => (
            <tr key={a.id}>
              <td>{a.creditName ?? a.name ?? '—'}</td>
              <td className="muted">{a.sectors}</td>
              <td className="mono">{a.written}</td>
              <td className="mono">{a.quota}</td>
              <td>{a.consented ? 'yes' : <span style={{ color: 'var(--danger)' }}>no</span>}</td>
              <td className="muted">{a.lastSeen ? a.lastSeen.toISOString().slice(0, 10) : 'never'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---- Task coverage ---- */}
      <h2>Task coverage</h2>
      <p className="muted">
        A finetune learns whatever shape it is shown. An instruction set that is all one task type
        teaches one trick, so the mix matters as much as the count.
      </p>
      <table>
        <thead><tr><th>Type</th><th>Written</th><th>What it is</th></tr></thead>
        <tbody>
          {TASK_TYPES.map((t) => (
            <tr key={t.key}>
              <td><strong>{t.label}</strong></td>
              <td className="mono">{s.byType.find((b) => b.type === t.key)?.n ?? 0}</td>
              <td className="muted">{t.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        <strong>Refusal and control items are not optional.</strong> Finetuning on tasks alone can
        strip whatever refusal behaviour the base model had, and we publish SomaliBench &mdash; we
        would be shipping the exact failure we measure in others.
      </p>

      {/* ---- Sector coverage ---- */}
      <h2>Sector coverage</h2>
      <table>
        <thead><tr><th>Sector</th><th>Written</th></tr></thead>
        <tbody>
          {SECTORS.map((sec) => {
            const n = s.bySector.find((b) => b.sector === sec)?.n ?? 0;
            return (
              <tr key={sec}>
                <td>{sec}{n === 0 && <span className="mono" style={{ color: 'var(--accent)' }}> nothing yet</span>}</td>
                <td className="mono">{n}</td>
              </tr>
            );
          })}
          {s.bySector
            .filter((b) => !SECTORS.includes(b.sector as (typeof SECTORS)[number]))
            .map((b) => (
              <tr key={b.sector}>
                <td>
                  {b.sector}{' '}
                  <span className="mono" style={{ color: 'var(--danger)' }}>
                    not a corpus sector
                  </span>
                </td>
                <td className="mono">{b.n}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* ---- Pipeline ---- */}
      <h2>Pipeline</h2>
      <table>
        <thead><tr><th>Stage</th><th>Items</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td>draft_en</td><td className="mono">{s.draftEn}</td><td className="muted">English written, Somali not started</td></tr>
          <tr><td>needs_somali</td><td className="mono">{s.needsSomali}</td><td className="muted">English approved, waiting for the Somali version</td></tr>
          <tr><td>needs_review</td><td className="mono">{s.needsReview}</td><td className="muted">Somali written, waiting for a verifier</td></tr>
          <tr><td>approved</td><td className="mono">{s.approved}</td><td className="muted">verified, exportable</td></tr>
        </tbody>
      </table>
      <p className="hint">
        {s.withEnglishBase} of {s.total} items carry an English base; {s.withInput} use the input
        field. Items written before the English-first design have neither, which is expected and
        fine &mdash; they are still valid Somali pairs.
      </p>
    </div>
  );
}
