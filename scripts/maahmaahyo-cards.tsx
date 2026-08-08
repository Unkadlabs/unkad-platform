// Generate a branded card image per proverb — the "Maahmaah of the day"
// content engine. Output: export/maahmaahyo/cards/<id>.png (1600×900).
//
// Run: npx tsx scripts/maahmaahyo-cards.tsx

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'maahmaahyo', 'maahmaahyo.tsv');
const OUT = path.join(ROOT, 'export', 'maahmaahyo', 'cards');
const FONTS = path.join(__dirname, '..', '..', 'dhiblabs', 'assets', 'fonts');

const DARK = { bg: '#141312', text: '#E8E6E1', muted: '#A5A19A', accent: '#4DB6A5' };

const fonts = [
  {
    name: 'Source Serif 4',
    data: fs.readFileSync(path.join(FONTS, 'SourceSerif4-Regular.otf')),
    weight: 400 as const,
    style: 'normal' as const,
  },
  {
    name: 'Source Serif 4',
    data: fs.readFileSync(path.join(FONTS, 'SourceSerif4-Bold.otf')),
    weight: 700 as const,
    style: 'normal' as const,
  },
];

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={DARK.accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={DARK.text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={DARK.text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={DARK.text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={DARK.text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={DARK.text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={DARK.text} />
    </svg>
  );
}

async function main() {
  const lines = fs.readFileSync(SRC, 'utf8').split('\n').filter(Boolean);
  const header = lines[0].split('\t');
  const rows = lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()]));
  });

  fs.mkdirSync(OUT, { recursive: true });

  for (const row of rows) {
    const proverbSize = row.proverb_so.length > 60 ? 56 : 72;
    const resp = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: DARK.bg,
            padding: 90,
            fontFamily: 'Source Serif 4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Mark size={44} />
            <div style={{ fontSize: 26, color: DARK.muted, display: 'flex' }}>
              Maahmaah · Somali proverb
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1300 }}>
            <div
              style={{
                fontSize: proverbSize,
                fontWeight: 700,
                color: DARK.text,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
              lang="so"
            >
              {`“${row.proverb_so}”`}
            </div>
            <div style={{ fontSize: 32, color: DARK.muted, lineHeight: 1.4 }}>
              {row.translation_en}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 24,
            }}
          >
            <div style={{ color: DARK.muted, display: 'flex' }}>
              Ereyada waa hanti.
            </div>
            <div style={{ color: DARK.accent, display: 'flex' }}>unkad.com</div>
          </div>
        </div>
      ),
      { width: 1600, height: 900, fonts }
    );
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(path.join(OUT, `${row.id}.png`), buf);
    console.log(`${row.id}.png  ${(buf.length / 1024).toFixed(0)}kB  ${row.proverb_so.slice(0, 40)}`);
  }
  console.log(`\ncards written to ${OUT}`);
}

main();
