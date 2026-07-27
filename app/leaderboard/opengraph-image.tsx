// Share card for the leaderboard, drawn from live data.
//
// This replaces the idea of exporting a poster every time the numbers move. The
// leaderboard is already public and always current, so the thing worth sharing
// is the link; this makes the preview card carry the same information a poster
// would, and it is never stale.
//
// Without it the page inherited the site-wide card, which says "Qor
// Af-Soomaali" and points og:url at the homepage — so sharing the leaderboard
// advertised the wrong page.
//
// Every Somali string is verbatim from lib/i18n.ts and already live on the
// site: `Hormoodka`, `jumlado la hubiyay`, `wax-ku-biiriyayaal`.

import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { corpusStats, leaderboardRows } from '@/lib/stats';

export const alt = 'Hormoodka — Qor Af-Soomaali';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Scrapers refetch on their own schedule, so a short window is enough to keep
// the card current without querying on every crawl.
export const revalidate = 300;

const BG = '#141312';
const TEXT = '#E8E6E1';
const MUTED = '#A5A19A';
const ACCENT = '#4DB6A5';

const ROWS = 5;
const CELLS = 22;

function fonts() {
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  return [
    {
      name: 'Source Serif 4',
      data: fs.readFileSync(path.join(dir, 'SourceSerif4-Regular.otf')),
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Source Serif 4',
      data: fs.readFileSync(path.join(dir, 'SourceSerif4-Bold.otf')),
      weight: 700 as const,
      style: 'normal' as const,
    },
  ];
}

function Mark({ size: s }: { size: number }) {
  const u = s / 100;
  const cell = (x: number, y: number, fill: string) => (
    <div
      key={`${x}-${y}`}
      style={{
        position: 'absolute',
        left: x * u,
        top: y * u,
        width: 24 * u,
        height: 24 * u,
        borderRadius: 6 * u,
        backgroundColor: fill,
      }}
    />
  );
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex' }}>
      {cell(38, 70, ACCENT)}
      {cell(6, 70, TEXT)}
      {cell(70, 70, TEXT)}
      {cell(6, 38, TEXT)}
      {cell(70, 38, TEXT)}
      {cell(6, 6, TEXT)}
      {cell(70, 6, TEXT)}
    </div>
  );
}

export default async function Image() {
  const [rows, corpus] = await Promise.all([leaderboardRows(ROWS), corpusStats()]);

  // Same scale for everyone so the bars are comparable, and it counts work in
  // flight: on a day when little has been accepted yet, an accepted-only scale
  // would draw every bar as empty.
  const max = Math.max(1, ...rows.map((r) => r.accepted + r.pending));
  const step = (n: number) => (n <= 0 ? 0 : Math.max(1, Math.round((n / max) * CELLS)));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '54px 64px',
          backgroundColor: BG,
          backgroundImage:
            'radial-gradient(820px 620px at 12% 108%, rgba(77,182,165,0.16), rgba(20,19,18,0) 64%)',
          fontFamily: 'Source Serif 4',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Mark size={40} />
              <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>Qor Af-Soomaali</div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 66,
                fontWeight: 700,
                color: ACCENT,
                letterSpacing: '-0.02em',
                marginTop: 22,
              }}
            >
              Hormoodka
            </div>
          </div>

          <div style={{ display: 'flex', gap: 44, marginTop: 8 }}>
            {[
              [corpus.accepted.toLocaleString(), 'jumlado la hubiyay'],
              [corpus.contributors.toLocaleString(), 'wax-ku-biiriyayaal'],
            ].map(([n, label]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 52,
                    fontWeight: 700,
                    color: TEXT,
                    lineHeight: 1,
                  }}
                >
                  {n}
                </div>
                <div style={{ display: 'flex', fontSize: 21, color: MUTED, marginTop: 10 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The ledger. Accepted cells are solid, work still in validation is
            drawn faint, so a contributor mid-review is not shown as having
            done nothing. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {rows.map((r) => {
            const filled = step(r.accepted);
            const ghost = Math.min(CELLS, Math.max(filled, step(r.accepted + r.pending)));
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: CELLS }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        backgroundColor:
                          i < filled
                            ? i === 0
                              ? ACCENT
                              : TEXT
                            : i < ghost
                              ? 'rgba(232,230,225,0.26)'
                              : 'rgba(232,230,225,0.09)',
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 27,
                    color: TEXT,
                    overflow: 'hidden',
                  }}
                >
                  {r.handle.length > 26 ? `${r.handle.slice(0, 25)}…` : r.handle}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 26,
          }}
        >
          <div style={{ display: 'flex', color: MUTED }}>Bilow hadda</div>
          <div style={{ display: 'flex', color: TEXT }}>qor.unkad.com/leaderboard</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts() }
  );
}
