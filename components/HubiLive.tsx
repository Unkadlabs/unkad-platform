'use client';

// The live board behind /hubi-ai/natiijo. Renders the server's first frame,
// then refetches the aggregates every 5 seconds. A failed fetch keeps the last
// good frame on screen rather than blanking it mid-event.

import { useEffect, useState } from 'react';
import type { HubiLive } from '@/lib/hubi-live';

type Labels = {
  title: string;
  sub: string;
  live: string;
  players: string;
  since: string; // contains {time}
  allTime: string;
  play: string;
  aiRight: string;
  aiWrong: string;
  judged: string;
  noAnswers: string;
  fooled: string;
  few: string;
  seeAll: string;
  back: string;
};

const POLL_MS = 5000;
const FEW = 5;

export default function HubiLiveBoard({
  initial,
  query,
  labels,
}: {
  initial: HubiLive;
  query: string;
  labels: Labels;
}) {
  const [data, setData] = useState<HubiLive>(initial);

  useEffect(() => {
    let alive = true;
    const url = `/hubi-ai/natiijo/data${query ? `?${query}` : ''}`;
    const tick = async () => {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) return;
        const next = (await r.json()) as HubiLive;
        if (alive) setData(next);
      } catch {
        // keep the last frame
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [query]);

  const windowLine = data.all
    ? labels.allTime
    : labels.since.replace('{time}', data.sinceLabel ?? '');

  return (
    <div className="live">
      <header className="live-head">
        <div>
          <h1 className="live-title" lang="so">{labels.title}</h1>
          <p className="live-sub">
            <span className="live-dot" aria-hidden="true" /> {labels.live}
            <span className="live-sep">·</span>
            {windowLine}
          </p>
        </div>
        <p className="live-play">
          {labels.play} <b>qor.unkad.com/hubi-ai</b>
        </p>
      </header>

      <section className="live-players" aria-live="polite">
        <span className="live-players-n tnum">{data.players}</span>
        <span className="live-players-label">{labels.players}</span>
      </section>

      {!data.all && data.players < FEW && (
        <p className="live-few">
          {labels.few} <a href="/hubi-ai/natiijo?all=1">{labels.seeAll} &rarr;</a>
        </p>
      )}
      {data.all && (
        <p className="live-few">
          <a href="/hubi-ai/natiijo">&larr; {labels.back}</a>
        </p>
      )}

      <ol className="live-items">
        {data.items.map((it, i) => {
          const pct = it.n ? Math.round((100 * it.ok) / it.n) : 0;
          const fooled = it.id === data.fooledId;
          return (
            <li key={it.id} className={`live-item${fooled ? ' is-fooled' : ''}`}>
              <div className="live-item-top">
                <span className="live-num tnum">{i + 1}</span>
                <p className="live-q" lang="so">{it.question}</p>
                <span className={`live-verdict ${it.aiRight ? 'is-right' : 'is-wrong'}`}>
                  {it.aiRight ? labels.aiRight : labels.aiWrong}
                </span>
              </div>
              {fooled && <p className="live-fooled-tag">{labels.fooled}</p>}
              {it.n ? (
                <div className="live-bar-row">
                  <div
                    className="live-track"
                    role="img"
                    aria-label={`${pct}% ${labels.judged}, n=${it.n}`}
                  >
                    <div className="live-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="live-pct tnum">{pct}%</span>
                </div>
              ) : null}
              <p className="live-meta">
                {it.n ? (
                  <>
                    {labels.judged} <span className="tnum">· n={it.n}</span>
                  </>
                ) : (
                  labels.noAnswers
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
