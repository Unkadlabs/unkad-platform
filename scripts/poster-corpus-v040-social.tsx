// X and LinkedIn cards for the v0.4.0 corpus release (20 Sep 2026), English.
// Same design as the Facebook poster, resized: X at 1600x900, LinkedIn at
// 1200x1200. One number, one line, the release, the address. Pure white.
//
// Run: npx tsx scripts/poster-corpus-v040-social.tsx
// Out: ../dhiblabs/assets/promo/x-corpus-v040.png, li-corpus-v040.png

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
const RULE = '#E4E2DD';

const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

type Size = { name: string; w: number; h: number; num: number; sub: number; small: number; pad: string };
const SIZES: Size[] = [
  { name: 'x', w: 1600, h: 900, num: 260, sub: 34, small: 25, pad: '72px 96px 64px' },
  { name: 'li', w: 1200, h: 1200, num: 300, sub: 36, small: 26, pad: '96px 96px 80px' },
];

function Card({ s }: { s: Size }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: s.pad, fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: s.small, color: MUTED }}>Qor Af-Soomaali</div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', fontSize: s.num, fontWeight: 700, color: TEXT, lineHeight: 0.95, letterSpacing: '-0.04em' }}>3,629</div>
      <div style={{ display: 'flex', marginTop: 28, fontSize: s.sub, color: TEXT, lineHeight: 1.35, maxWidth: 900 }}>
        Somali sentences, now on Hugging Face
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', width: 120, height: 3, backgroundColor: RULE }} />
      <div style={{ display: 'flex', marginTop: 22, fontSize: s.small, color: ACCENT, fontWeight: 700 }}>
        Qor Af-Soomaali v0.4.0 · written and checked by 246 people
      </div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: s.small, color: MUTED }}>
        Open. Anyone can use it.
      </div>
      <div style={{ display: 'flex', flexGrow: 0.6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: s.small - 2, color: MUTED }}>
        <div style={{ display: 'flex' }}>Unkad Labs</div>
        <div style={{ display: 'flex', color: TEXT }}>huggingface.co/datasets/unkadlabs/qor-af-soomaali</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const s of SIZES) {
    const resp = new ImageResponse(<Card s={s} />, { width: s.w, height: s.h, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `${s.name}-corpus-v040.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${s.w}x${s.h}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
