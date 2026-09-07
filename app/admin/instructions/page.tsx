// The instruction dataset workbench (English-only internal tool).
//
// One job: get the instruction set to 1,000 pairs without anyone having to be
// told how. The page is written so that whoever opens it — khalid, a reviewer,
// a volunteer who has never seen this project — can read the state, see which
// sector is starving, and write the prompt that fixes it, in that order,
// without asking anyone.
//
// A pair is a prompt plus its accepted answer, so writing prompts IS building
// the dataset. The page leads with yield because that is the non-obvious part:
// a write prompt has been worth many times a translate prompt.

import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { addPrompts } from '@/lib/actions';
import { instructionState, SECTORS } from '@/lib/instructions';

type Props = { searchParams: Promise<{ added?: string }> };

export default async function InstructionsPage({ searchParams }: Props) {
  await requireRole('admin');
  const { added } = await searchParams;
  const s = await instructionState();

  const starving = s.bySector.slice(0, 3).map((r) => r.sector);
  const pct = Math.min(100, s.pct);

  return (
    <div className="container">
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/admin">&larr; Admin</Link>
      </p>

      <h1>Instruction dataset</h1>
      <p className="muted">
        The target is {s.goal.toLocaleString()} instruction pairs to finetune Unug. A pair is one
        prompt plus one accepted Somali answer, so <strong>writing prompts is how the dataset gets
        built</strong>. This page shows what exists, what is missing, and lets you add prompts.
      </p>

      {added && (
        <p className="hint" style={{ color: 'var(--accent)' }}>
          Added {added} prompt{added === '1' ? '' : 's'}. They are live for contributors now.
        </p>
      )}

      {/* ---- Where we stand ---- */}
      <h2>Where we stand</h2>
      <p style={{ fontSize: '2.2rem', fontWeight: 700, margin: '0.2rem 0' }}>
        {s.total.toLocaleString()}{' '}
        <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}>
          of {s.goal.toLocaleString()} pairs &middot; {s.remaining.toLocaleString()} to go
        </span>
      </p>
      <div
        style={{
          height: 14, background: 'var(--rule, #e8e6e1)', borderRadius: 7,
          overflow: 'hidden', maxWidth: '34rem', marginBottom: '0.5rem',
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
      </div>
      <p className="hint">
        {pct.toFixed(1)}% complete. Counted as accepted submissions that came from a prompt.
      </p>

      {/* ---- The one number that decides what to do ---- */}
      <h2>Which prompt is worth writing</h2>
      <table>
        <thead>
          <tr><th>Prompt type</th><th>Pairs produced per prompt</th><th>What it means</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>write</strong> (a question in Somali)</td>
            <td className="mono">{s.writeYield?.toFixed(1) ?? '—'}</td>
            <td className="muted">
              One prompt keeps producing. Many people can answer the same question differently, and
              each answer is a valid pair.
            </td>
          </tr>
          <tr>
            <td><strong>translate</strong> (an English sentence)</td>
            <td className="mono">{s.translateYield?.toFixed(1) ?? '—'}</td>
            <td className="muted">
              Roughly one answer per prompt. Good for coverage, weak for volume.
            </td>
          </tr>
        </tbody>
      </table>
      {s.writeYield && s.translateYield && s.writeYield > s.translateYield && (
        <p className="hint">
          <strong>So: write prompts are currently worth about {(s.writeYield / s.translateYield).toFixed(0)}x
          a translate prompt.</strong> If you only have time for one thing, add write prompts.
        </p>
      )}

      {/* ---- Coverage ---- */}
      <h2>Coverage by sector</h2>
      <p className="muted">
        The model should work across Somali life, not just the sectors people happen to enjoy
        writing about. Thinnest first, so the top rows are where to aim.
      </p>
      <table>
        <thead>
          <tr>
            <th>Sector</th><th>Pairs</th><th>Write prompts</th>
            <th>Translate prompts</th><th>Unanswered</th>
          </tr>
        </thead>
        <tbody>
          {s.bySector.map((r) => (
            <tr key={r.sector}>
              <td>
                {r.sector}
                {starving.includes(r.sector) && (
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>
                    {' '}needs work
                  </span>
                )}
              </td>
              <td className="mono">{r.pairs}</td>
              <td className="mono">{r.writePrompts}</td>
              <td className="mono">{r.translatePrompts}</td>
              <td className="mono">{r.unanswered}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        <strong>{s.unansweredTotal} prompts have never been answered.</strong> Those are already
        paid for: pointing contributors at them costs nothing and produces pairs immediately.
      </p>

      {/* ---- Add prompts ---- */}
      <h2>Add prompts</h2>
      <p className="muted">
        One prompt per line, in the form <span className="mono">Somali || English</span>. The Somali
        is what contributors see; the English is for our own records and becomes the instruction
        text in the exported dataset.
      </p>
      <div className="card">
        <h3>What makes a good instruction prompt</h3>
        <ul>
          <li>
            <strong>If ChatGPT can already answer it well, throw it away.</strong> The value of this
            dataset is knowledge that is not already in the models.
          </li>
          <li>
            <strong>Ask for something only a Somali speaker could answer</strong> — lived
            experience, local practice, how a thing is actually done or said here.
          </li>
          <li>
            <strong>Open, not yes-or-no.</strong> &ldquo;Sharax sida...&rdquo; (explain how),
            &ldquo;Ka sheekee...&rdquo; (tell about), &ldquo;Maxaa...&rdquo; (what).
          </li>
          <li>
            <strong>Answerable in a few sentences</strong> by an ordinary person, without research.
          </li>
          <li>
            <strong>Tag the sector honestly.</strong> Coverage is the point; putting everything in
            &ldquo;general&rdquo; hides the gap.
          </li>
        </ul>
      </div>

      <form action={addPrompts} className="stack" style={{ marginTop: '1rem' }}>
        <input type="hidden" name="mode" value="write" />

        <label>
          Sector
          <select name="sector" defaultValue={s.bySector[0]?.sector ?? 'general'} required>
            {SECTORS.map((sec) => {
              const row = s.bySector.find((r) => r.sector === sec);
              return (
                <option key={sec} value={sec}>
                  {sec} ({row?.pairs ?? 0} pairs)
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Register
          <select name="register" defaultValue="conversational" required>
            <option value="conversational">conversational (everyday speech)</option>
            <option value="narrative">narrative (telling a story)</option>
            <option value="instructional">instructional (how to do a thing)</option>
            <option value="formal">formal (official, written)</option>
            <option value="technical">technical (specialist)</option>
          </select>
        </label>

        <label>
          Topic
          <input name="topic" placeholder="e.g. beeraha, caafimaadka carruurta" required />
        </label>

        <label>
          Prompts, one per line
          <textarea
            name="batch"
            rows={8}
            required
            placeholder={'Sharax sida loo beero galleyda. || Explain how maize is planted.\nKa sheekee suuqa magaaladaada. || Describe the market in your town.'}
          />
        </label>

        <button className="btn" type="submit">Add prompts</button>
      </form>

      <p className="hint" style={{ marginTop: '1.5rem' }}>
        Every prompt added here is live for contributors immediately at qor.unkad.com. Somali text
        is published as written, so check it before adding.
      </p>
    </div>
  );
}
