'use client';

// "Unug mise Qof?" — guess whether each sentence was written by Unug (the
// lab's tiny model) or by a human contributor. Client-only: a fixed,
// shuffled-once deck, score kept in state, nothing written anywhere.
// Sentence provenance: human items come from the released (public) corpus;
// Unug items are raw model output, unretouched.

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type GameItem = { text: string; unug: boolean };

type Labels = {
  question: string;
  btnUnug: string;
  btnHuman: string;
  correct: string;
  wrong: string;
  wasUnug: string;
  wasHuman: string;
  next: string;
  scoreTitle: string;
  scoreLine: string; // contains {score} and {total}
  perfect: string;
  fooled: string;
  playAgain: string;
  cta: string;
  ctaBtn: string;
};

function shuffle<T>(arr: T[], seed: number): T[] {
  // deterministic-enough Fisher-Yates so server and client agree per mount
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function UnugGame({ items, labels }: { items: GameItem[]; labels: Labels }) {
  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState(7);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);

  const deck = useMemo(() => shuffle(items, seed), [items, seed]);
  const item = deck[idx];
  const done = idx >= deck.length;

  function answer(guessUnug: boolean) {
    if (picked !== null) return;
    setPicked(guessUnug);
    if (guessUnug === item.unug) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setIdx((i) => i + 1);
  }

  function again() {
    setRound((r) => r + 1);
    setSeed(seed + 13);
    setIdx(0);
    setScore(0);
    setPicked(null);
  }

  if (done) {
    const fooled = deck.length - score;
    return (
      <div className="card" key={round}>
        <h3>{labels.scoreTitle}</h3>
        <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
          {labels.scoreLine.replace('{score}', String(score)).replace('{total}', String(deck.length))}
        </p>
        <p className="muted">{score === deck.length ? labels.perfect : labels.fooled.replace('{n}', String(fooled))}</p>
        <div className="btn-row">
          <button className="btn" onClick={again} type="button">
            {labels.playAgain}
          </button>
        </div>
        <p className="hint" style={{ marginTop: '1rem' }}>
          {labels.cta} <Link href="/join">{labels.ctaBtn}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="mono muted" style={{ fontSize: '0.8rem' }}>
        {idx + 1} / {deck.length}
      </p>
      <p lang="so" style={{ fontSize: '1.15rem', lineHeight: 1.6 }}>
        &ldquo;{item.text}&rdquo;
      </p>
      {picked === null && <p className="hint">{labels.question}</p>}
      {picked === null ? (
        <div className="btn-row">
          <button className="btn" onClick={() => answer(true)} type="button">
            {labels.btnUnug}
          </button>
          <button className="btn" onClick={() => answer(false)} type="button">
            {labels.btnHuman}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontWeight: 700 }}>
            {picked === item.unug ? labels.correct : labels.wrong}{' '}
            <span className="muted" style={{ fontWeight: 400 }}>
              {item.unug ? labels.wasUnug : labels.wasHuman}
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
