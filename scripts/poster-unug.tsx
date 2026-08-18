// "Unug baa maqan" — the missing cell poster (Aug 2026).
//
// The Unkad mark is seven cells assembling from a seed. This poster renders
// the mark INCOMPLETE: six cells solid, the seed cell empty, outlined in
// teal. The missing cell is the viewer. One idea, straight from the brand.
//
// Somali lines are drafts — !! VERIFY SOMALI !! — khalid reviews the
// rendered poster before posting, as with every promo.
//
// Run: npx tsx scripts/poster-unug.tsx
// Out: ../dhiblabs/assets/promo/fb-unug-maqan.png (1080x1350)

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

// The seven cells of the mark, seed at bottom center. Here the seed is the
// one that's missing: outlined, waiting.
const CELLS: Array<{ x: number; y: number; missing?: boolean }> = [
  { x: 38, y: 70, missing: true },
  { x: 6, y: 70 },
  { x: 70, y: 70 },
  { x: 6, y: 38 },
  { x: 70, y: 38 },
  { x: 6, y: 6 },
  { x: 70, y: 6 },
];

function IncompleteMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {CELLS.map((c) =>
        c.missing ? (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x + 1.5}
            y={c.y + 1.5}
            width={21}
            height={21}
            rx={5}
            fill="none"
            stroke={C.accent}
            strokeWidth={3}
            strokeDasharray="7 5"
          />
        ) : (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={24} height={24} rx={6} fill={C.text} />
        )
      )}
    </svg>
  );
}

function SmallMark({ size }: { size: number }) {
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
      {/* Header lockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <SmallMark size={54} />
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.text }}>
          Unkad Labs
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* The incomplete mark, center stage */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <IncompleteMark size={380} />
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Headline — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 74,
            fontWeight: 700,
            color: C.text,
            letterSpacing: '-0.01em',
          }}
        >
          Unug baa maqan.
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 10,
            fontSize: 74,
            fontWeight: 700,
            color: C.accent,
            letterSpacing: '-0.01em',
          }}
        >
          Adiga ayuu yahay.
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 29,
            color: C.muted,
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 780,
          }}
        >
          Kaydka Soomaaliga wuxuu ka dhismaa unug unug: jumlad aad qorto, turjunto, ama
          hubiso. Shan daqiiqo maanta nagala qeyb qaado.
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1.2 }} />

      {/* Footer */}
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
  const file = path.join(OUT_DIR, 'fb-unug-maqan.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
