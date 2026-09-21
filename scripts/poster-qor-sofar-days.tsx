// "So far", third design (21 Sep 2026): 65 bars, one per day since the first
// sentence on 19 July, each as tall as the sentences accepted that day. The
// launch day towers, the rest is the honest texture of a volunteer project.
// Nothing is smoothed or capped. Pure white, one accent. Somali and English.
// Somali sub line founder-verified 21 Sep 2026; the eyebrow is a draft:
// !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-qor-sofar-days.tsx
// Out: ../dhiblabs/assets/promo/fb-qor-sofar-days-so.png, -en.png (1080x1350)

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

// Accepted sentences per day, 19 Jul to 21 Sep 2026 (Mogadishu time).
// Production, read-only, pulled 21 Sep 2026.
const DAYS = [1,0,0,0,2,1211,200,129,85,66,199,95,84,38,45,198,77,35,23,32,140,120,27,41,24,23,84,52,50,0,135,22,5,106,11,0,10,0,18,0,94,0,5,40,73,73,8,33,5,88,3,27,1,0,20,0,51,0,3,0,0,101,0,0,0];
const MAX = Math.max(...DAYS);
const W = 912, H = 620, GAP = 3;
const BAR = (W - GAP * (DAYS.length - 1)) / DAYS.length;

const COPY = [
  { lang: 'so' as const, eyebrow: '64 maalmood, maalin walba hal xariiq', sub: 'jumladood oo af-soomali ah oo la hubiyay' },
  { lang: 'en' as const, eyebrow: '64 days, one bar per day', sub: 'validated Somali sentences' },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '110px 84px 90px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 26, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', alignItems: 'flex-end', width: W, height: H, gap: GAP }}>
        {DAYS.map((v, i) => (
          <div key={i} style={{ display: 'flex', width: BAR, height: Math.max(2, (v / MAX) * H), backgroundColor: v === 0 ? '#E4E2DD' : ACCENT }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, marginTop: 12, fontSize: 20, color: MUTED }}>
        <div style={{ display: 'flex' }}>19 Jul</div>
        <div style={{ display: 'flex' }}>21 Sep</div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 150, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: '-0.04em' }}>4,014</div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 30, color: TEXT }} lang={c.lang}>{c.sub}</div>

      <div style={{ display: 'flex', marginTop: 56, justifyContent: 'space-between', fontSize: 22, color: MUTED }}>
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
    const file = path.join(OUT_DIR, `fb-qor-sofar-days-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
