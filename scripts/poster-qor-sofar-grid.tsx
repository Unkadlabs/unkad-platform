// "So far", second design (21 Sep 2026): the goal drawn as 100 squares,
// one per thousand sentences. Four are filled. Nothing else competes with
// that. Pure white, Literata, one accent. Somali and English.
// The Somali sub line is founder-verified (21 Sep 2026); '64 maalmood' is
// still a draft: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-qor-sofar-grid.tsx
// Out: ../dhiblabs/assets/promo/fb-qor-sofar-grid-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FFFFFF';
const TEXT = '#171715';
const MUTED = '#8A867E';
const ACCENT = '#0F6B5C';
const EMPTY = '#ECEAE5';

const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

const DONE = 4014;
const GOAL = 100_000;
const FILLED = Math.floor(DONE / 1000); // 4 full squares
const PARTIAL = (DONE % 1000) / 1000; // the fifth, 1.4% of the way

const COPY = [
  { lang: 'so' as const, days: '64 maalmood', sub: 'jumladood oo af-soomali ah oo la hubiyay', goal: '100,000' },
  { lang: 'en' as const, days: '64 days', sub: 'validated Somali sentences', goal: '100,000' },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  const cell = 58, gap = 12;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '110px 116px 96px', fontFamily: 'Literata' }}>
      <div style={{ display: "flex", fontSize: 26, color: MUTED, marginBottom: 40 }} lang={c.lang}>{c.days}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', width: cell * 10 + gap * 9, gap }}>
        {Array.from({ length: 100 }, (_, i) => {
          const full = i < FILLED;
          const part = i === FILLED;
          return (
            <div key={i} style={{ display: 'flex', width: cell, height: cell, backgroundColor: full ? ACCENT : EMPTY, position: 'relative', overflow: 'hidden' }}>
              {part && <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: cell, height: cell * PARTIAL, backgroundColor: ACCENT }} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: '-0.04em' }}>4,014</div>
        <div style={{ display: 'flex', fontSize: 34, color: MUTED }}>/ {c.goal}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 30, color: TEXT }} lang={c.lang}>{c.sub}</div>

      <div style={{ display: 'flex', marginTop: 64, justifyContent: 'space-between', fontSize: 22, color: MUTED }}>
        <div style={{ display: 'flex' }}>Unkad Labs</div>
        <div style={{ display: 'flex', color: TEXT }}>qor.unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-qor-sofar-grid-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
