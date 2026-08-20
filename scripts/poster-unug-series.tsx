// "Unug" — the model series announcement poster, ultra-minimal (Aug 2026).
//
// One idea, told with light: the full Unkad mark sits in near-darkness,
// six cells barely visible — and only the seed cell is lit. Creation from
// nothing. Below it, the name and a single whispered line. Nothing else.
// Somali lines are drafts — !! VERIFY SOMALI !! — khalid reviews before
// posting.
//
// Run: npx tsx scripts/poster-unug-series.tsx
// Out: ../dhiblabs/assets/promo/fb-unug-series.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#0C0B0A';
const TEXT = '#E8E6E1';
const MUTED = '#8F8B84';
const FAINT = '#191817'; // the unlit cells, one breath above the background
const ACCENT = '#4DB6A5';

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

// The Unkad "U": seven cells. Six unlit, the seed glowing.
function DarkMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.32" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* halo behind the seed */}
      <circle cx="50" cy="82" r="46" fill="url(#glow)" />
      {/* unlit cells */}
      <rect x="6" y="70" width="24" height="24" rx="6" fill={FAINT} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={FAINT} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={FAINT} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={FAINT} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={FAINT} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={FAINT} />
      {/* the seed, lit */}
      <rect x="38" y="70" width="24" height="24" rx="6" fill={ACCENT} />
    </svg>
  );
}

function Poster() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: BG,
        backgroundImage:
          'radial-gradient(circle at 50% 40%, rgba(77,182,165,0.05), rgba(12,11,10,0) 55%)',
        padding: '84px 84px 72px',
        fontFamily: 'Source Serif 4',
      }}
    >
      <div style={{ display: 'flex', flexGrow: 1.2 }} />

      <DarkMark size={340} />

      <div
        style={{
          display: 'flex',
          marginTop: 84,
          fontSize: 148,
          fontWeight: 700,
          color: TEXT,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        Unug
      </div>

      {/* Eyebrow — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          marginTop: 34,
          fontSize: 25,
          color: MUTED,
          letterSpacing: '0.32em',
        }}
      >
        MOODELADA AF-SOOMAALIGA
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* One whispered line — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          textAlign: 'center',
          fontSize: 30,
          fontStyle: 'italic',
          color: MUTED,
          lineHeight: 1.6,
          maxWidth: 760,
        }}
        lang="so"
      >
        Wax walba waxay ka bilowdaan unug.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div style={{ display: 'flex', fontWeight: 700, color: ACCENT }}>Unkad Labs</div>
        <div style={{ display: 'flex', width: 4, height: 4, borderRadius: 2, backgroundColor: MUTED }} />
        <div style={{ display: 'flex' }}>qor.unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'fb-unug-series.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
