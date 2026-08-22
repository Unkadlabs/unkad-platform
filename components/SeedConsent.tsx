'use client';

// Shown once, before anything can be written. A person cannot agree to terms
// they have not been shown, so the licence, the publication, and the credit
// line are all stated on this screen rather than linked from it.

import { useState, useTransition } from 'react';
import { recordConsent } from '@/lib/seed';

type L = Record<string, string>;

export default function SeedConsent({
  token, labels,
}: { token: string; labels: L }) {
  // Empty on purpose. The link may have been handed on, so the person in front
  // of it is the only one who can say who they are.
  const [creditName, setCreditName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="seed-wrap">
      <h1 className="seed-h1">{labels.welcome}</h1>
      <p className="seed-lede">{labels.intro}</p>

      <h2 className="seed-h2">{labels.title}</h2>
      <ul className="seed-terms">
        <li>{labels.p1}</li>
        <li>{labels.p2}</li>
        <li>{labels.p3}</li>
        <li>{labels.p4}</li>
        <li>{labels.p5}</li>
      </ul>

      <label className="seed-field">
        <span className="seed-label">{labels.credit}</span>
        <input
          className="seed-input"
          value={creditName}
          onChange={(e) => setCreditName(e.target.value)}
          maxLength={80}
        />
      </label>

      <label className="seed-agree">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>{labels.agree}</span>
      </label>

      {err && <p className="seed-error">{err.replace(/^ERR:/, '')}</p>}

      <button
        className="seed-btn"
        disabled={!agreed || pending || creditName.trim().length < 2}
        onClick={() =>
          start(async () => {
            const e = await recordConsent(token, creditName);
            if (e) setErr(e);
          })
        }
      >
        {labels.cta}
      </button>
    </div>
  );
}
