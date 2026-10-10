// Posters for the fabrication study (Oct 2026), Somali and English.
// Asked about 27 Somali poems and events that do not exist, Llama 3.1 said
// "I don't know" 15 times in English and 0 times in Somali. The foot line
// carries the four-model figure so the number is not cherry-picked.
// Numbers from ~/research/unkad-fabrication/results (founder spot-checked).
// Pure white. Somali: head, unit, sub and foot follow the founder-verified post (5 Oct 2026).
//
// Run: npx tsx scripts/poster-dont-know.tsx
// Out: ../dhiblabs/assets/promo/fb-dont-know-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', ACCENT = '#0F6B5C', RULE = '#E4E2DD';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Cilmi-baaris Unkad Labs',
    head: 'Waxaan AI-ga weydiinay 27 gabay iyo dhacdo Soomaaliyeed oo aan jirin.',
    left: 'Ingiriisi', right: 'Af-Soomaali',
    unit: 'jeer ayuu yiri «Ma aqaan»',
    sub: 'Llama 3.1. Af-Soomaali: wuu sameystay qofka tiriyay gabayga, sannadka, iyo sheeko dhamaystiran.',
    foot: '4 Model oo AI ah marka aan ku waydiinay Af-Soomaali: «ma aqaan» waxay dheheen 9 jeer oo keliya 108 su’aalood.',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Unkad Labs research',
    head: 'We asked AI about 27 Somali poems and events that never existed.',
    left: 'Asked in English', right: 'Asked in Somali',
    unit: 'times it said “I don’t know”',
    sub: 'Llama 3.1. In Somali it never once said it did not know. It invented authors, dates and stories.',
    foot: 'Four models, asked in Somali: “I don’t know” 9 times out of 108.',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  const col = (label: string, n: number, color: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', fontSize: 26, color: MUTED }} lang={c.lang}>{label}</div>
      <div style={{ display: 'flex', fontSize: 280, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.04em' }}>{n}</div>
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 46, fontWeight: 700, color: TEXT, lineHeight: 1.2 }} lang={c.lang}>
        {c.head.replace(/-/g, '‑')}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', borderTop: `2px solid ${RULE}`, paddingTop: 28 }}>
        {col(c.left, 15, MUTED)}
        <div style={{ display: 'flex', width: 2, backgroundColor: RULE, margin: '0 40px' }} />
        {col(c.right, 0, ACCENT)}
      </div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: 30, color: TEXT }} lang={c.lang}>{c.unit}</div>
      <div style={{ display: 'flex', marginTop: 26, fontSize: 27, color: MUTED, lineHeight: 1.4, maxWidth: 880 }} lang={c.lang}>{c.sub}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 22, color: MUTED, gap: 40 }}>
        <div style={{ display: 'flex', color: TEXT, fontStyle: 'italic', maxWidth: 760 }} lang={c.lang}>{c.foot}</div>
        <div style={{ display: 'flex' }}>unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-dont-know-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
