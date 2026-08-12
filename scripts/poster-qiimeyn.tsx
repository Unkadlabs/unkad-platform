// Facebook posters for the qiimeyn results (Aug 2026) — benchmark-chart
// style, in Somali, to pair with the founder-verified Somali post.
//
//   fb-qiimeyn-results.png  1080x1350  catch-rate bar chart (Somali, LIGHT)
//   fb-qiimeyn-sectors.png  1080x1350  sector-accuracy chart (Somali, LIGHT)
//   fb-qiimeyn-square.png   1080x1080  the 96% illusion (English companion,
//                                      dark)
//
// Somali chart copy is founder-verified (khalid, 2026-08-12), including the
// corrected titles "Keebaa qabtay qoraalada khaldan?" and "Way garan karaan
// mowduuca uu qoraalku ku saabsan yahay." One knowing deviation: khalid's
// fix note wrote "khalan" once where his own surrounding text has
// "khaldan"; rendered as "khaldan" — flagged for his eye.
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

type Palette = {
  bg: string; text: string; muted: string; accent: string; rule: string; bar: string;
};

// Site light tokens (globals.css :root)
const LIGHT: Palette = {
  bg: '#FCFBF8',
  text: '#1A1917',
  muted: '#6B6862',
  accent: '#0F6B5C',
  rule: '#E5E2DA',
  bar: '#C2BDB2',
};

// Dark system, as on the alignment poster
const DARK: Palette = {
  bg: '#141312',
  text: '#E8E6E1',
  muted: '#A5A19A',
  accent: '#4DB6A5',
  rule: '#2E2C29',
  bar: '#4A4642',
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

function Mark({ size, p }: { size: number; p: Palette }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={p.accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={p.text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={p.text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={p.text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={p.text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={p.text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={p.text} />
    </svg>
  );
}

const Header = ({ p }: { p: Palette }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
    <Mark size={54} p={p} />
    <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: p.text }}>Unkad Labs</div>
  </div>
);

const Eyebrow = ({ children, mt, p, size = 24, tracking = '0.22em' }: {
  children: string; mt: number; p: Palette; size?: number; tracking?: string;
}) => (
  <div
    style={{
      display: 'flex',
      marginTop: mt,
      fontSize: size,
      color: p.accent,
      letterSpacing: tracking,
    }}
  >
    {children}
  </div>
);

const Footer = ({ p }: { p: Palette }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', gap: 26, fontSize: 26 }}>
      <div style={{ display: 'flex', color: p.accent }}>unkad.com</div>
      <div style={{ display: 'flex', color: p.muted }}>qor.unkad.com</div>
    </div>
    <div style={{ display: 'flex', fontSize: 22, color: p.muted }}>
      Unkad — creation from nothing
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Poster 1 — the catch-rate benchmark, Somali, light background.

const CHART_H = 470;
const NAME_H = 84;

const BENCH: Array<{ name: string[]; pct: number; human?: boolean }> = [
  { name: ['Asxaabta', 'Qor'], pct: 100, human: true },
  { name: ['Claude', 'Sonnet 5'], pct: 13 },
  { name: ['GPT-5.6', ''], pct: 0 },
  { name: ['Gemini', '3.1 Pro'], pct: 0 },
];

function ResultsPoster() {
  const p = LIGHT;
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: p.bg, padding: '72px 84px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header p={p} />
      <Eyebrow mt={58} p={p}>QIIMEYN · MODELADA HORMUUDKA AH</Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 16, fontSize: 54, fontWeight: 700,
          lineHeight: 1.2, color: p.text, letterSpacing: '-0.01em',
        }}
      >
        Keebaa qabtay qoraalada khaldan?
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 25, color: p.muted }}>
        23 qoraal oo asxaabta Qor ay diideen, 593 qoraal oo la tijaabiyay.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Chart */}
      <div style={{ display: 'flex', position: 'relative', height: CHART_H + NAME_H + 60 }}>
        {[0, 25, 50, 75, 100].map((v) => (
          <div
            key={`l-${v}`}
            style={{
              display: 'flex', position: 'absolute', left: 84, right: 0, height: 0,
              bottom: NAME_H + (v / 100) * CHART_H,
              borderTop: v === 0 ? `2px solid ${p.muted}` : `1px solid ${p.rule}`,
            }}
          />
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <div
            key={`t-${v}`}
            style={{
              display: 'flex', position: 'absolute', left: 0, width: 70,
              bottom: NAME_H + (v / 100) * CHART_H - 13,
              fontSize: 21, color: p.muted, justifyContent: 'flex-end',
            }}
          >
            {`${v}%`}
          </div>
        ))}

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
                  color: b.human ? p.accent : b.pct ? p.text : p.muted,
                  marginBottom: 10,
                }}
              >
                {`${b.pct}%`}
              </div>
              <div
                style={{
                  display: 'flex', width: 150,
                  height: Math.max(5, (b.pct / 100) * CHART_H),
                  backgroundColor: b.human ? p.accent : p.bar,
                  borderRadius: '10px 10px 0 0',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: NAME_H, paddingTop: 14 }}>
                <div style={{ display: 'flex', fontSize: 26, color: b.human ? p.text : p.muted, fontWeight: b.human ? 700 : 400 }}>
                  {b.name[0]}
                </div>
                {b.name[1] ? (
                  <div style={{ display: 'flex', fontSize: 26, color: b.human ? p.text : p.muted, fontWeight: b.human ? 700 : 400 }}>
                    {b.name[1]}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 26, color: p.muted, lineHeight: 1.5, marginBottom: 38 }}>
        Way akhriyi karaan Soomaaliga. Laakiin ma kala garan karaan qoraal
        saxan iyo mid khaldan.
      </div>

      <Footer p={p} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poster 2 — the sector chart, Somali, light background. Sector names from
// the platform's live i18n dictionary (lib/i18n.ts sector_* keys).

const SECTORS: Array<{ name: string; pct: number }> = [
  { name: 'Caafimaad', pct: 98 },
  { name: 'Tignoolajiyad', pct: 96 },
  { name: 'Beeraha', pct: 93 },
  { name: 'Diin', pct: 91 },
  { name: 'Waxbarasho', pct: 86 },
  { name: 'Sharci', pct: 61 },
  { name: 'Dhaqan', pct: 55 },
  { name: 'Guud', pct: 49 },
  { name: 'Warbaahin', pct: 43 },
];
const SBAR_MAX = 620;

function SectorsPoster() {
  const p = LIGHT;
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: p.bg, padding: '72px 84px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header p={p} />
      <Eyebrow mt={54} p={p} size={20} tracking="0.16em">
        QIIMEYNTA MOWDUUCA UU QORAALKU KU SAABSAN YAHAY
      </Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 16, fontSize: 50, fontWeight: 700,
          lineHeight: 1.22, color: p.text, letterSpacing: '-0.01em',
        }}
      >
        Way garan karaan mowduuca uu qoraalku ku saabsan yahay.
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 25, color: p.muted, lineHeight: 1.45 }}>
        Saddex meelood laba way saxeen. Celceliska saddexda model.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {SECTORS.map((s, i) => (
          <div
            key={s.name}
            style={{
              display: 'flex', alignItems: 'center', padding: '15px 0',
              borderTop: i === 0 ? `1px solid ${p.rule}` : 'none',
            }}
          >
            <div style={{ display: 'flex', width: 250, flexShrink: 0, fontSize: 28, color: p.text }}>
              {s.name}
            </div>
            <div
              style={{
                display: 'flex',
                width: Math.max(6, (s.pct / 100) * SBAR_MAX),
                height: 30, borderRadius: 7,
                backgroundColor: s.pct >= 80 ? p.accent : p.bar,
              }}
            />
            <div
              style={{
                display: 'flex', marginLeft: 18, fontSize: 27, fontWeight: 700,
                color: s.pct >= 80 ? p.accent : p.muted,
              }}
            >
              {`${s.pct}%`}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 26, color: p.muted, lineHeight: 1.5, marginBottom: 38 }}>
        Akhrinta way karaan laakiin qoraalada khaldan 23/23 si dhamaystiran
        waxa qabtay oo kaliya asxaabta Qor.
      </div>

      <Footer p={p} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poster 3 — the 96% illusion, English companion, dark.

const ILLUSION: Array<{ name: string; agree: number; caught: number }> = [
  { name: 'GPT-5.6', agree: 95.8, caught: 0 },
  { name: 'Gemini 3.1 Pro', agree: 96.1, caught: 0 },
  { name: 'Claude Sonnet 5', agree: 93.6, caught: 13 },
];

const BAR_MAX = 660;

function SquarePoster() {
  const p = DARK;
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: p.bg, padding: '68px 80px', fontFamily: 'Source Serif 4',
      }}
    >
      <Header p={p} />
      <Eyebrow mt={44} p={p}>QIIMEYN · THE 96% ILLUSION</Eyebrow>

      <div
        style={{
          display: 'flex', marginTop: 14, fontSize: 48, fontWeight: 700,
          lineHeight: 1.2, color: p.text, letterSpacing: '-0.01em',
        }}
      >
        A judge that only says yes still scores 96%.
      </div>

      <div style={{ display: 'flex', gap: 36, marginTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', width: 22, height: 22, borderRadius: 6, backgroundColor: p.bar }} />
          <div style={{ display: 'flex', fontSize: 23, color: p.muted }}>agreement with human validators</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', width: 22, height: 22, borderRadius: 6, backgroundColor: p.accent }} />
          <div style={{ display: 'flex', fontSize: 23, color: p.muted }}>bad Somali caught</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ILLUSION.map((m, i) => (
          <div
            key={m.name}
            style={{
              display: 'flex', flexDirection: 'column', padding: '22px 0',
              borderTop: `1px solid ${p.rule}`,
              ...(i === ILLUSION.length - 1 ? { borderBottom: `1px solid ${p.rule}` } : {}),
            }}
          >
            <div style={{ display: 'flex', fontSize: 28, color: p.text, marginBottom: 14 }}>{m.name}</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex', width: (m.agree / 100) * BAR_MAX, height: 26,
                  backgroundColor: p.bar, borderRadius: 6,
                }}
              />
              <div style={{ display: 'flex', marginLeft: 16, fontSize: 25, color: p.muted }}>{`${m.agree}%`}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
              <div
                style={{
                  display: 'flex', width: Math.max(5, (m.caught / 100) * BAR_MAX), height: 26,
                  backgroundColor: p.accent, borderRadius: 6,
                }}
              />
              <div style={{ display: 'flex', marginLeft: 16, fontSize: 25, fontWeight: 700, color: p.accent }}>{`${m.caught}%`}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 25, color: p.muted, lineHeight: 1.5, marginBottom: 34 }}>
        96% of submissions are good, so approving everything looks like
        expertise. Qor volunteers caught all 23 bad ones. The frontier's best
        caught 3.
      </div>

      <Footer p={p} />
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
  await render('fb-qiimeyn-sectors.png', <SectorsPoster />, 1080, 1350);
  await render('fb-qiimeyn-square.png', <SquarePoster />, 1080, 1080);
}

main();
