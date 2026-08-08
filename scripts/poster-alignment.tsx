// Facebook poster for the AI-alignment post (Aug 2026).
//
// One idea: 2026's incident log is being written, and the last entry is
// still open. Somali carries the emotion (the post's own closing line,
// verbatim); English mono-register lines carry the two documented
// incidents; the teal seed cell marks the entry that is ours to write.
//
// Run: npx tsx scripts/poster-alignment.tsx
// Out: ../dhiblabs/assets/promo/fb-alignment-2026.png (1080×1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const DARK = {
  bg: '#141312',
  text: '#E8E6E1',
  muted: '#A5A19A',
  accent: '#4DB6A5',
  rule: '#2E2C29',
  card: '#1C1B19',
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

function Mark({ size, text, accent }: { size: number; text: string; accent: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={text} />
    </svg>
  );
}

// A single mark-cell used as a log bullet.
function Cell({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="24" height="24" rx="6" fill={color} />
    </svg>
  );
}

// !! VERIFY SOMALI !! — quoted verbatim from the founder's post; only the
// leading capital and final period were added for display as a pull-quote.
const HEADLINE =
  'Si aynaan indho-la’aan ugu sugin mustaqbal ay kuwa kale noo qoreen, ee aan qeyb ka noqono qoriddiisa.';

const LOG: Array<{ text: string; open?: boolean }> = [
  { text: 'An AI model hacked another lab’s systems to pass its test.' },
  { text: 'An AI agent forged identities to pressure a software maintainer.' },
  { text: 'The next entry is not written yet.', open: true },
];

function Poster() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: DARK.bg,
        padding: '76px 84px',
        fontFamily: 'Source Serif 4',
      }}
    >
      {/* Header lockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Mark size={54} text={DARK.text} accent={DARK.accent} />
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: DARK.text }}>
          Unkad Labs
        </div>
      </div>

      {/* Eyebrow */}
      <div
        style={{
          display: 'flex',
          marginTop: 96,
          fontSize: 25,
          color: DARK.accent,
          letterSpacing: '0.22em',
        }}
      >
        AI ALIGNMENT · 2026
      </div>

      {/* Headline — the post's own closing line */}
      <div
        style={{
          display: 'flex',
          marginTop: 26,
          fontSize: 62,
          fontWeight: 700,
          lineHeight: 1.24,
          color: DARK.text,
          letterSpacing: '-0.01em',
        }}
        lang="so"
      >
        {'“' + HEADLINE + '”'}
      </div>

      <div style={{ display: 'flex', flexGrow: 1.2 }} />

      {/* The 2026 log — the signature. Last entry is open. */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {LOG.map((entry, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '30px 4px',
              borderTop: `1px solid ${DARK.rule}`,
              ...(i === LOG.length - 1 ? { borderBottom: `1px solid ${DARK.rule}` } : {}),
            }}
          >
            <Cell size={18} color={entry.open ? DARK.accent : DARK.muted} />
            <div
              style={{
                display: 'flex',
                fontSize: 29,
                color: entry.open ? DARK.text : DARK.muted,
                fontWeight: entry.open ? 700 : 400,
              }}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 26, fontSize: 26 }}>
          <div style={{ display: 'flex', color: DARK.accent }}>unkad.com</div>
          <div style={{ display: 'flex', color: DARK.muted }}>qor.unkad.com</div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: DARK.muted }}>
          Unkad — creation from nothing
        </div>
      </div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'fb-alignment-2026.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
