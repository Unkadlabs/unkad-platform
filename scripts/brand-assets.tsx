// One-off generator for social/profile brand assets (LinkedIn, X, etc.):
//  - logo-300.png   (300×300  — profile logos; platforms reject SVG)
//  - banner-1128x191.png (LinkedIn company cover)
// Uses the same mark geometry and Source Serif faces as the OG cards.
// Output: ../dhiblabs/assets/brand/

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const FONTS_DIR = '/Users/khalidyusufdahir/research/dhiblabs/assets/fonts';
const OUT_DIR = '/Users/khalidyusufdahir/research/dhiblabs/assets/brand';

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

async function render(element: React.ReactElement, width: number, height: number, file: string) {
  const resp = new ImageResponse(element, { width, height, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, file), buf);
  console.log(`${file}: ${buf.length} bytes`);
}

async function main() {
// 300×300 logo — mark on warm off-white (light backgrounds dominate LinkedIn).
await render(
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FCFBF8',
    }}
  >
    <Mark size={190} text="#1A1917" accent="#0F6B5C" />
  </div>,
  300,
  300,
  'logo-300.png'
);

// 1128×191 LinkedIn cover — dark, wordmark + gloss, quiet.
await render(
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#141312',
      padding: '0 64px',
      gap: 28,
      fontFamily: 'Source Serif 4',
    }}
  >
    <Mark size={84} text="#E8E6E1" accent="#4DB6A5" />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 52, fontWeight: 700, color: '#E8E6E1', letterSpacing: '-0.01em' }}>
        Unkad Labs
      </div>
      <div style={{ fontSize: 22, color: '#A5A19A', marginTop: 4 }}>
        Unkad — Somali for creation from nothing.
      </div>
    </div>
    <div
      style={{
        marginLeft: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontSize: 20,
        color: '#4DB6A5',
      }}
    >
      <div style={{ display: 'flex' }}>unkad.com</div>
      <div style={{ display: 'flex', color: '#A5A19A' }}>qor.unkad.com</div>
    </div>
  </div>,
  1128,
  191,
  'banner-1128x191.png'
);

console.log(`Assets written to ${OUT_DIR}`);
}

main();
