// Facebook posters for the qiimeyn results (Aug 2026) — benchmark-chart
// style, the way the big labs present evaluations.
//
//   fb-qiimeyn-results.png  1080x1350  vertical bar chart: catch rate on the
//                                      23 community-rejected texts, humans
//                                      vs the three frontier models
//   fb-qiimeyn-square.png   1080x1080  grouped horizontal bars: agreement
//                                      (the number that looks great) vs bad
//                                      submissions caught (the number that
//                                      measures the job)
//
// Same dark system as poster-alignment: bg #141312, teal #4DB6A5, Source
// Serif 4. Poster copy is English; the Somali carries the Facebook post.
//
// Run: npx tsx scripts/poster-qiimeyn.tsx
// Out: ../dhiblabs/assets/promo/

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const C = {
  bg: '#141312',
  text: '#E8E6E1',
  muted: '#A5A19A',
  accent: '#4DB6A5',
  rule: '#2E2C29',
  bar: '#4A4642', // non-highlighted bars, the "them" color
};

const fonts = [
  {
    name: 'Source Serif 4',
    data: fs.readFileSync(path.join(FONTS_DIR, 'SourceSerif4-Regular.otf')),
    weight: 400 as const,
    style: 'normal' as const,
  },
  {
    name: 'Source Serif 4',
    data: fs.readFileSync(path.join(FONTS_DIR, 'SourceSerif4-Bold.otf')),
    weight: 700 as const,
    style: 'normal' as const,
  },
];

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={C.accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={C.text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={C.text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={C.text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={C.text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={C.text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={C.text} />
    </svg>
  );
}

const Header = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
    <Mark size={54} />
    <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.text }}>Unkad Labs</div>
  </div>
);

const Eyebrow = ({ children, mt }: { children: string; mt: number }) => (
  <div
    style={{
      display: 'flex',
      marginTop: mt,
      fontSize: 24,
      color: C.accent,
      letterSpacing: '0.22em',
    }}
  >
    {children}
  </div>
);

const Footer = () => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', gap: 26, fontSize: 26 }}>
      <div style={{ display: 'flex', color: C.accent }}>unkad.com</div>
      <div style={{ display: 'flex', color: C.muted }}>qor.unkad.com</div>
    </div>
    <div style={{ display: 'flex', fontSize: 22, color: C.muted }}>
      Unkad — creation from nothing
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Poster 1 — the benchmark chart. One metric, drawn to scale: of the 23
// texts the community rejected, how many did each judge catch?

const CHART_H = 470; // px height of the 100% mark
const NAME_H = 84;   // reserved lane under the baseline for model names

const BENCH: Array<{ name: string[]; pct: number; human?: boolean }> = [
  { name: ['Qor', 'volunteers'], pct: 100, human: true },
  { name: ['Claude', 'Sonnet 5'], pct: 13 },
  { name: ['GPT-5.6', ''], pct: 0 },
  { name: ['Gemini', '3.1 Pro'], pct: 0 },
];

function ResultsPoster() {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: C.bg, padding: '72px 84px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header />
      <Eyebrow mt={58}>QIIMEYN · EVALUATING THE FRONTIER ON SOMALI</Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 16, fontSize: 54, fontWeight: 700,
          lineHeight: 1.2, color: C.text, letterSpacing: '-0.01em',
        }}
      >
        Who catches bad Somali?
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 25, color: C.muted }}>
        23 community-rejected submissions out of 593. Higher is better.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Chart */}
      <div style={{ display: 'flex', position: 'relative', height: CHART_H + NAME_H + 60 }}>
        {/* gridlines + y labels, each anchored exactly at its value */}
        {[0, 25, 50, 75, 100].map((v) => (
          <div
            key={`l-${v}`}
            style={{
              display: 'flex', position: 'absolute', left: 84, right: 0, height: 0,
              bottom: NAME_H + (v / 100) * CHART_H,
              borderTop: v === 0 ? `2px solid ${C.muted}` : `1px solid ${C.rule}`,
            }}
          />
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <div
            key={`t-${v}`}
            style={{
              display: 'flex', position: 'absolute', left: 0, width: 70,
              bottom: NAME_H + (v / 100) * CHART_H - 13,
              fontSize: 21, color: C.muted, justifyContent: 'flex-end',
            }}
          >
            {`${v}%`}
          </div>
        ))}

        {/* bars */}
        <div
          style={{
            display: 'flex', position: 'absolute', left: 100, right: 10, bottom: 0,
            alignItems: 'flex-end', justifyContent: 'space-between',
          }}
        >
          {BENCH.map((b) => (
            <div key={b.name[0]} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 190 }}>
              <div
                style={{
                  display: 'flex', fontSize: 40, fontWeight: 700,
                  color: b.human ? C.accent : b.pct ? C.text : C.muted,
                  marginBottom: 10,
                }}
              >
                {`${b.pct}%`}
              </div>
              <div
                style={{
                  display: 'flex', width: 150,
                  height: Math.max(5, (b.pct / 100) * CHART_H),
                  backgroundColor: b.human ? C.accent : C.bar,
                  borderRadius: '10px 10px 0 0',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: NAME_H, paddingTop: 14 }}>
                <div style={{ display: 'flex', fontSize: 26, color: b.human ? C.text : C.muted, fontWeight: b.human ? 700 : 400 }}>
                  {b.name[0]}
                </div>
                {b.name[1] ? (
                  <div style={{ display: 'flex', fontSize: 26, color: b.human ? C.text : C.muted, fontWeight: b.human ? 700 : 400 }}>
                    {b.name[1]}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 26, color: C.muted, lineHeight: 1.5, marginBottom: 38 }}>
        The same models place a Somali text in the right domain two times out
        of three. They can read it. They cannot judge it.
      </div>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poster 2 — the illusion, as a grouped-bar chart. For each model, the
// metric that looks perfect next to the metric that measures the job.

const ILLUSION: Array<{ name: string; agree: number; caught: number }> = [
  { name: 'GPT-5.6', agree: 95.8, caught: 0 },
  { name: 'Gemini 3.1 Pro', agree: 96.1, caught: 0 },
  { name: 'Claude Sonnet 5', agree: 93.6, caught: 13 },
];

const BAR_MAX = 660;

function SquarePoster() {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: C.bg, padding: '68px 80px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header />
      <Eyebrow mt={44}>QIIMEYN · THE 96% ILLUSION</Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 14, fontSize: 48, fontWeight: 700,
          lineHeight: 1.2, color: C.text, letterSpacing: '-0.01em',
        }}
      >
        A judge that only says yes still scores 96%.
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 36, marginTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', width: 22, height: 22, borderRadius: 6, backgroundColor: C.bar }} />
          <div style={{ display: 'flex', fontSize: 23, color: C.muted }}>agreement with human validators</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', width: 22, height: 22, borderRadius: 6, backgroundColor: C.accent }} />
          <div style={{ display: 'flex', fontSize: 23, color: C.muted }}>bad Somali caught</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ILLUSION.map((m, i) => (
          <div
            key={m.name}
            style={{
              display: 'flex', flexDirection: 'column', padding: '22px 0',
              borderTop: `1px solid ${C.rule}`,
              ...(i === ILLUSION.length - 1 ? { borderBottom: `1px solid ${C.rule}` } : {}),
            }}
          >
            <div style={{ display: 'flex', fontSize: 28, color: C.text, marginBottom: 14 }}>{m.name}</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex', width: (m.agree / 100) * BAR_MAX, height: 26,
                  backgroundColor: C.bar, borderRadius: 6,
                }}
              />
              <div style={{ display: 'flex', marginLeft: 16, fontSize: 25, color: C.muted }}>{`${m.agree}%`}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
              <div
                style={{
                  display: 'flex', width: Math.max(5, (m.caught / 100) * BAR_MAX), height: 26,
                  backgroundColor: C.accent, borderRadius: 6,
                }}
              />
              <div style={{ display: 'flex', marginLeft: 16, fontSize: 25, fontWeight: 700, color: C.accent }}>{`${m.caught}%`}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 25, color: C.muted, lineHeight: 1.5, marginBottom: 34 }}>
        96% of submissions are good, so approving everything looks like
        expertise. Qor volunteers caught all 23 bad ones. The frontier's best
        caught 3.
      </div>

      <Footer />
    </div>
  );
}

async function render(name: string, node: React.ReactElement, width: number, height: number) {
  const resp = new ImageResponse(node, { width, height, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, buf);
  console.log(`${file}  ${width}x${height}  ${(buf.length / 1024).toFixed(1)}kB`);
}

async function main() {
  await render('fb-qiimeyn-results.png', <ResultsPoster />, 1080, 1350);
  await render('fb-qiimeyn-square.png', <SquarePoster />, 1080, 1080);
}

main();
