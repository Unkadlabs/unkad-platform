// Facebook poster for khalid's "why are people afraid of AI" post (Sep 2026).
//
// Ultra-minimal: one question, two lines, the lab's name. The post's thesis
// (capability outrunning understanding) is drawn, not annotated. The two
// line labels are words from the post itself; the title is a draft:
// !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-ai-cabsi.tsx
// Out: ../dhiblabs/assets/promo/fb-ai-cabsi.png (1080x1350)

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

// Two lines from one origin. Capability compounds; understanding creeps.
// No fill, no annotations: the widening space between them is the argument.
const CW = 912, CH = 520;
const cap = (x: number) => (Math.exp(3.4 * x) - 1) / (Math.exp(3.4) - 1);
const und = (x: number) => 0.16 * x;
const px = (x: number) => x * CW;
const py = (y: number) => CH - 40 - y * (CH - 80);
const xs = Array.from({ length: 81 }, (_, i) => i / 80);
const line = (f: (x: number) => number) => xs.map((x) => `${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`).join(' ');

function Poster() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '120px 84px 84px', fontFamily: 'Literata' }}>
      {/* Title: !! VERIFY SOMALI !! */}
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 58, lineHeight: 1.2, color: TEXT, letterSpacing: '-0.01em' }} lang="so">
        <div style={{ display: 'flex' }}>Awooddu way sii kordhaysaa.</div>
        <div style={{ display: 'flex', color: MUTED }}>Fahamkeennu ma la socdaa?</div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', position: 'relative', width: CW, height: CH }}>
        <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <polyline points={line(cap)} fill="none" stroke={TEXT} strokeWidth="3" strokeLinecap="round" />
          <polyline points={line(und)} fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ display: 'flex', position: 'absolute', right: 0, top: py(1) - 44, fontSize: 24, color: TEXT }} lang="so">awoodda</div>
        <div style={{ display: 'flex', position: 'absolute', right: 0, top: py(und(1)) + 14, fontSize: 24, color: ACCENT }} lang="so">fahamkeenna</div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>Unkad Labs</div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'fb-ai-cabsi.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
