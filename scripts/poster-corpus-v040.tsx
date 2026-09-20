// Facebook posters for the v0.4.0 corpus release (20 Sep 2026), Somali and
// English. Ultra-minimal, pure white: one number, one line under it, one
// line for the release, the address. The number is what is on Hugging Face
// today, nothing else. Somali lines are drafts: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-corpus-v040.tsx
// Out: ../dhiblabs/assets/promo/fb-corpus-v040-so.png, -en.png (1080x1350)

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

type Copy = { lang: 'so' | 'en'; eyebrow: string; sub: string; release: string; open: string };

const COPY: Copy[] = [
  {
    lang: 'so',
    // sub and open: founder-verified 2026-09-20. release line: !! VERIFY SOMALI !!
    eyebrow: 'Qor Af-Soomaali',
    sub: 'jumladood oo af-somaali ah, oo aad ka heli kartid keydkeena yaala hugging face',
    release: 'Qor Af-Soomaali v0.4.0 · 246 qof ayaa qoray oo hubiyay',
    open: 'waxay u furantahay inuu qof kasta isticmaalo',
  },
  {
    lang: 'en',
    eyebrow: 'Qor Af-Soomaali',
    sub: 'Somali sentences, now on Hugging Face',
    release: 'Qor Af-Soomaali v0.4.0 · written and checked by 246 people',
    open: 'Open. Anyone can use it.',
  },
];

function Poster({ c }: { c: Copy }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '110px 84px 84px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>{c.eyebrow}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 300, fontWeight: 700, color: TEXT, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
        3,629
      </div>
      <div style={{ display: 'flex', marginTop: 36, fontSize: 36, color: TEXT, lineHeight: 1.35, maxWidth: 860 }} lang={c.lang}>
        {c.sub}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', width: 120, height: 3, backgroundColor: RULE }} />
      <div style={{ display: 'flex', marginTop: 30, fontSize: 27, color: ACCENT, fontWeight: 700 }} lang={c.lang}>
        {c.release}
      </div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 27, color: MUTED }} lang={c.lang}>
        {c.open}
      </div>

      <div style={{ display: 'flex', flexGrow: 0.8 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: MUTED }}>
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
    const file = path.join(OUT_DIR, `fb-corpus-v040-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
