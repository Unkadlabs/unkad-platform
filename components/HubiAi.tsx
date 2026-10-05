'use client';

// "Hubi AI-ga": one real AI answer at a time, the visitor says right or
// wrong, sees the verdict, moves on. After the deck, three short questions
// about how they use AI. Then one form post carries everything to the
// server, which scores it again (the client is never trusted for the score)
// and redirects to the result page. The survey is optional and can be skipped.
//
// Progress is recorded as it happens ('start' when the first item shows, one
// 'answer' per click) under a random per-visit session id, so a visitor who
// leaves halfway still counts. Those calls are fire-and-forget: a failure to
// record never touches the quiz.

import { useEffect, useRef, useState } from 'react';

export type QuizItem = { id: string; question: string; answer: string; model: string; right: boolean; why: string };

type Labels = {
  question: string;
  btnRight: string;
  btnWrong: string;
  correct: string;
  wrong: string;
  next: string;
  profileTitle: string;
  profileIntro: string;
  qUse: string;
  useOpts: [string, string, string];
  qTrained: string;
  trainedOpts: [string, string, string, string];
  qFluent: string;
  fluentOpts: [string, string, string];
  submit: string;
  skip: string;
  saidBy: string; // contains {model}
};

const USE = ['never', 'sometimes', 'daily'] as const;
const TRAINED = ['internet', 'taught', 'thinks', 'unsure'] as const;
const FLUENT = ['yes', 'no', 'unsure'] as const;

// A random id for this visit only. Not stored in the browser, not tied to
// any person; a reload starts a new session.
function newSessionId(): string {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  } catch {
    return '';
  }
}

export default function HubiAi({
  items,
  labels,
  action,
  record,
}: {
  items: QuizItem[];
  labels: Labels;
  action: (formData: FormData) => Promise<void>;
  record: (session: string, kind: string, itemId?: string | null, said?: string | null) => Promise<void>;
}) {
  const session = useRef('');
  const [sessionId, setSessionId] = useState('');

  function track(kind: string, itemId?: string, v?: string) {
    if (!session.current) return;
    try {
      record(session.current, kind, itemId ?? null, v ?? null).catch(() => {});
    } catch {
      // never let tracking break the quiz
    }
  }

  // First item is on screen once mounted: start the session.
  useEffect(() => {
    if (session.current) return;
    session.current = newSessionId();
    setSessionId(session.current);
    track('start');
  }, []);

  const [idx, setIdx] = useState(0);
  const [said, setSaid] = useState<Record<string, 'sax' | 'khalad'>>({});
  const [picked, setPicked] = useState<'sax' | 'khalad' | null>(null);
  const [use, setUse] = useState<string | null>(null);
  const [trained, setTrained] = useState<string | null>(null);
  const [fluent, setFluent] = useState<string | null>(null);

  const item = items[idx];
  const done = idx >= items.length;

  function answer(v: 'sax' | 'khalad') {
    if (picked !== null) return;
    setPicked(v);
    setSaid((s) => ({ ...s, [item.id]: v }));
    track('answer', item.id, v);
  }

  function next() {
    setPicked(null);
    setIdx((i) => i + 1);
  }

  if (!done) {
    const wasRight = picked !== null && (picked === 'sax') === item.right;
    return (
      <div className="card">
        <p className="mono muted" style={{ fontSize: '0.8rem' }}>
          {idx + 1} / {items.length}
        </p>
        <p className="muted" lang="so" style={{ marginBottom: '0.25rem' }}>
          {item.question}
        </p>
        <p lang="so" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
          &ldquo;{item.answer}&rdquo;
        </p>
        <p className="hint">{labels.saidBy.replace('{model}', item.model)}</p>
        {picked === null ? (
          <>
            <p className="hint">{labels.question}</p>
            <div className="btn-row">
              <button className="btn" onClick={() => answer('sax')} type="button">
                {labels.btnRight}
              </button>
              <button className="btn" onClick={() => answer('khalad')} type="button">
                {labels.btnWrong}
              </button>
            </div>
          </>
        ) : (
          <div>
            <p style={{ fontWeight: 700 }}>
              {wasRight ? labels.correct : labels.wrong}{' '}
              <span className="muted" style={{ fontWeight: 400 }} lang="so">
                {item.why}
              </span>
            </p>
            <div className="btn-row">
              <button className="btn" onClick={next} type="button">
                {labels.next}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="card">
      <h3>{labels.profileTitle}</h3>
      <p className="muted">{labels.profileIntro}</p>
      {items.map((it) => (
        <input key={it.id} type="hidden" name={`a_${it.id}`} value={said[it.id] ?? ''} />
      ))}
      <input type="hidden" name="session" value={sessionId} />

      <Choice name="use" legend={labels.qUse} values={USE} opts={labels.useOpts} value={use} onChange={setUse} />
      <Choice name="trained" legend={labels.qTrained} values={TRAINED} opts={labels.trainedOpts} value={trained} onChange={setTrained} />
      <Choice name="fluent" legend={labels.qFluent} values={FLUENT} opts={labels.fluentOpts} value={fluent} onChange={setFluent} />

      <div className="btn-row">
        <button className="btn" type="submit">
          {labels.submit}
        </button>
        <button className="btn" type="submit" name="skip" value="1">
          {labels.skip}
        </button>
      </div>
    </form>
  );
}

function Choice({
  name,
  legend,
  values,
  opts,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  values: readonly string[];
  opts: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '1rem 0' }}>
      <legend style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{legend}</legend>
      {values.map((v, i) => (
        <label key={v} style={{ display: 'block', margin: '0.3rem 0', cursor: 'pointer' }}>
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            style={{ marginRight: '0.5rem' }}
          />
          {opts[i]}
        </label>
      ))}
    </fieldset>
  );
}
