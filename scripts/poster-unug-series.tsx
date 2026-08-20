// "Unug" — the model series announcement poster (Aug 2026).
//
// The name reveal. One idea: the seed cell of the Unkad mark, enlarged,
// becomes the model's identity — unug is the cell, the smallest living
// unit, and the models grow from it: Unug-0 (the mascot), Unug-1 (in
// training). No numbers, no curves; the deep thread follows in a later
// post. Somali lines are drafts — !! VERIFY SOMALI !! — khalid reviews
// before posting.
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

function Poster() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.bg,
        padding: '76px 84px',
        fontFamily: 'Source Serif 4',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Mark size={54} />
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.text }}>
          Unkad Labs
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* The seed cell, alone and large */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={150} height={150} viewBox="0 0 100 100">
          <rect x="14" y="14" width="72" height="72" rx="16" fill={C.accent} />
        </svg>
      </div>

      {/* The name */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 44,
          fontSize: 130,
          fontWeight: 700,
          color: C.text,
          letterSpacing: '-0.02em',
        }}
      >
        Unug
      </div>

      {/* What it is — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 16,
          fontSize: 30,
          color: C.accent,
          letterSpacing: '0.14em',
        }}
      >
        MOODELADA AF-SOOMAALIGA EE UNKAD LABS
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* The line — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 32,
          color: C.muted,
          lineHeight: 1.55,
        }}
        lang="so"
      >
        Unug waa qaybta ugu yar ee nolosha. Halkaas ayaan ka bilaabaynaa:
        moodel yar oo Soomaali ku baranaya jumladaha aad qortaan.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          borderTop: `1px solid ${C.rule}`,
          paddingTop: 30,
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.accent }}>
          qor.unkad.com
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: C.muted }}>
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
  const file = path.join(OUT_DIR, 'fb-unug-series.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
