// Facebook posters for the qiimeyn results (Aug 2026).
//
// Two renders:
//   fb-qiimeyn-results.png  1080x1350  the 0/23 catch grid, the experiment's
//                                      central image, one cell per rejected
//                                      submission
//   fb-qiimeyn-square.png   1080x1080  the one-sentence finding with the
//                                      scoreboard, for feed/profile
//
// Same dark system as poster-alignment: bg #141312, teal #4DB6A5, Source
// Serif 4. Poster copy is English (like the alignment log lines); the Somali
// carries the Facebook post itself, drafted separately for founder review.
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
      fontSize: 25,
      color: C.accent,
      letterSpacing: '0.22em',
    }}
  >
    {children}
  </div>
);

const JUDGES: Array<{ name: string; caught: number; human?: boolean }> = [
  { name: 'Qor validators', caught: 23, human: true },
  { name: 'Claude Sonnet 5', caught: 3 },
  { name: 'GPT-5.6', caught: 0 },
  { name: 'Gemini 3.1 Pro', caught: 0 },
];

function CellRow({ caught, human }: { caught: number; human?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
      {Array.from({ length: 23 }, (_, i) => (
        <div
          key={i}
          style={
            i < caught
              ? {
                  display: 'flex', width: 33, height: 33, borderRadius: 8,
                  backgroundColor: human ? C.accent : C.text,
                }
              : {
                  display: 'flex', width: 33, height: 33, borderRadius: 8,
                  border: `2px solid ${C.rule}`,
                }
          }
        />
      ))}
    </div>
  );
}

function ResultsPoster() {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: C.bg, padding: '76px 84px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header />
      <Eyebrow mt={70}>QIIMEYN · WE TESTED THE FRONTIER</Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 18, fontSize: 56, fontWeight: 700,
          lineHeight: 1.22, color: C.text, letterSpacing: '-0.01em',
        }}
      >
        23 bad Somali submissions. The strongest AI models caught 0.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {JUDGES.map((j, i) => (
          <div
            key={j.name}
            style={{
              display: 'flex', flexDirection: 'column',
              padding: '24px 0',
              borderTop: `1px solid ${C.rule}`,
              ...(i === JUDGES.length - 1 ? { borderBottom: `1px solid ${C.rule}` } : {}),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div
                style={{
                  display: 'flex', fontSize: 30,
                  color: j.human ? C.text : C.muted,
                  fontWeight: j.human ? 700 : 400,
                }}
              >
                {j.name}
              </div>
              <div
                style={{
                  display: 'flex', fontSize: 30, fontWeight: 700,
                  color: j.human ? C.accent : j.caught ? C.text : C.muted,
                }}
              >
                {`${j.caught}/23`}
              </div>
            </div>
            <CellRow caught={j.caught} human={j.human} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 27, color: C.muted, lineHeight: 1.5 }}>
        They can read Somali. They cannot judge it. That is why the corpus is
        built by people.
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 40,
        }}
      >
        <div style={{ display: 'flex', gap: 26, fontSize: 26 }}>
          <div style={{ display: 'flex', color: C.accent }}>unkad.com</div>
          <div style={{ display: 'flex', color: C.muted }}>qor.unkad.com</div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: C.muted }}>
          Unkad — creation from nothing
        </div>
      </div>
    </div>
  );
}

function SquarePoster() {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: C.bg, padding: '72px 80px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header />
      <Eyebrow mt={56}>QIIMEYN · 2026</Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 20, fontSize: 60, fontWeight: 700,
          lineHeight: 1.22, color: C.text, letterSpacing: '-0.01em',
        }}
      >
        The frontier can read Somali. It cannot judge it.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[
          ['Bad Somali the community caught', '23/23', true],
          ['Bad Somali Claude Sonnet 5 caught', '3/23', false],
          ['Bad Somali GPT-5.6 caught', '0/23', false],
          ['Bad Somali Gemini 3.1 Pro caught', '0/23', false],
        ].map(([label, score, human], i, arr) => (
          <div
            key={String(label)}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              padding: '26px 4px',
              borderTop: `1px solid ${C.rule}`,
              ...(i === arr.length - 1 ? { borderBottom: `1px solid ${C.rule}` } : {}),
            }}
          >
            <div
              style={{
                display: 'flex', fontSize: 30,
                color: human ? C.text : C.muted,
                fontWeight: human ? 700 : 400,
              }}
            >
              {String(label)}
            </div>
            <div
              style={{
                display: 'flex', fontSize: 34, fontWeight: 700,
                color: human ? C.accent : C.muted,
              }}
            >
              {String(score)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 26, fontSize: 26 }}>
          <div style={{ display: 'flex', color: C.accent }}>unkad.com</div>
          <div style={{ display: 'flex', color: C.muted }}>qor.unkad.com</div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: C.muted }}>
          Unkad — creation from nothing
        </div>
      </div>
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
