// X and LinkedIn cards of the "one bar per day" poster (21 Sep 2026),
// English. Same data and design as poster-qor-sofar-days.tsx, resized:
// X at 1600x900, LinkedIn at 1200x1200. Pure white, one accent.
//
// Run: npx tsx scripts/poster-qor-sofar-days-social.tsx
// Out: ../dhiblabs/assets/promo/x-qor-sofar-days.png, li-qor-sofar-days.png

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

const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

// Accepted sentences per day, 19 Jul to 21 Sep 2026. Production, read-only.
const DAYS = [1,0,0,0,2,1211,200,129,85,66,199,95,84,38,45,198,77,35,23,32,140,120,27,41,24,23,84,52,50,0,135,22,5,106,11,0,10,0,18,0,94,0,5,40,73,73,8,33,5,88,3,27,1,0,20,0,51,0,3,0,0,101,0,0,0];
const MAX = Math.max(...DAYS);

type Size = { name: string; w: number; h: number; pad: string; chartW: number; chartH: number; num: number; sub: number; small: number; side: boolean };
const SIZES: Size[] = [
  { name: 'x', w: 1600, h: 900, pad: '70px 96px 60px', chartW: 900, chartH: 560, num: 150, sub: 30, small: 24, side: true },
  { name: 'li', w: 1200, h: 1200, pad: '96px 96px 80px', chartW: 1008, chartH: 520, num: 140, sub: 30, small: 24, side: false },
];

function Bars({ w, h }: { w: number; h: number }) {
  const gap = 3;
  const bar = (w - gap * (DAYS.length - 1)) / DAYS.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: w }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', width: w, height: h, gap }}>
        {DAYS.map((v, i) => (
          <div key={i} style={{ display: 'flex', width: bar, height: Math.max(2, (v / MAX) * h), backgroundColor: v === 0 ? '#E4E2DD' : ACCENT }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 20, color: MUTED }}>
        <div style={{ display: 'flex' }}>19 Jul</div>
        <div style={{ display: 'flex' }}>21 Sep</div>
      </div>
    </div>
  );
}

function Card({ s }: { s: Size }) {
  const number = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: s.num, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: '-0.04em' }}>4,014</div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: s.sub, color: TEXT }}>validated Somali sentences</div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: s.small, color: MUTED }}>64 days, one bar per day</div>
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: s.pad, fontFamily: 'Literata' }}>
      {s.side ? (
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'flex-end', justifyContent: 'space-between', gap: 60 }}>
          <Bars w={s.chartW} h={s.chartH} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 36, width: 440 }}>{number}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div style={{ display: 'flex', fontSize: s.small, color: MUTED }}>64 days, one bar per day</div>
          <div style={{ display: 'flex', flexGrow: 1 }} />
          <Bars w={s.chartW} h={s.chartH} />
          <div style={{ display: 'flex', flexGrow: 1 }} />
          <div style={{ display: 'flex', fontSize: s.num, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: '-0.04em' }}>4,014</div>
          <div style={{ display: 'flex', marginTop: 14, fontSize: s.sub, color: TEXT }}>validated Somali sentences</div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, fontSize: s.small - 2, color: MUTED }}>
        <div style={{ display: 'flex' }}>Unkad Labs</div>
        <div style={{ display: 'flex', color: TEXT }}>qor.unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const s of SIZES) {
    const resp = new ImageResponse(<Card s={s} />, { width: s.w, height: s.h, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `${s.name}-qor-sofar-days.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${s.w}x${s.h}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
