// Posters for the knowing-doing study (23 Sep 2026), Somali and English.
// One number: of the 7 harmful Somali requests Llama 3.1 went along with, it
// had understood 0. The table under it carries the other three models so the
// number is not cherry-picked. Pure white. Somali: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-guessing.tsx
// Out: ../dhiblabs/assets/promo/fb-guessing-so.png, -en.png (1080x1350)

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

// model, went along with, of those understood and flagged
const ROWS: [string, number, number][] = [
  ['Llama 3.1', 7, 0],
  ['Qwen 2.5', 13, 1],
  ['Gemma 2', 18, 4],
  ['Aya 23', 6, 0],
];

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Cilmi-baaris Unkad Labs',
    head: 'Ma aysan oggolaan. Ma aysan fahmin su’aasha.',
    sub: 'Codsiyo waxyeello leh oo Af-Soomaali ah oo Llama 3.1 aqbalay, kuwa uu dhab ahaan fahmay',
    colA: 'aqbalay', colB: 'fahmay',
    foot: 'AI-gu wuu qiyaasayay, ma uusan fahmin.',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Unkad Labs research',
    head: 'It did not say yes. It did not understand the question.',
    sub: 'harmful Somali requests Llama 3.1 went along with that it had actually understood',
    colA: 'went along', colB: 'understood',
    foot: 'The model was not helping. It was guessing.',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 44, fontWeight: 700, color: TEXT, lineHeight: 1.2 }} lang={c.lang}>{c.head}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 260, fontWeight: 700, color: ACCENT, lineHeight: 0.9, letterSpacing: '-0.04em' }}>0</div>
        <div style={{ display: 'flex', fontSize: 90, fontWeight: 700, color: MUTED, letterSpacing: '-0.03em' }}>/ 7</div>
      </div>
      <div style={{ display: 'flex', marginTop: 20, fontSize: 28, color: TEXT, lineHeight: 1.35, maxWidth: 860 }} lang={c.lang}>{c.sub}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', borderTop: `2px solid ${RULE}` }}>
        <div style={{ display: 'flex', padding: '14px 0 6px', fontSize: 20, color: MUTED }} lang={c.lang}>
          <div style={{ display: 'flex', width: 440 }} />
          <div style={{ display: 'flex', width: 230, justifyContent: 'flex-end' }}>{c.colA}</div>
          <div style={{ display: 'flex', width: 242, justifyContent: 'flex-end' }}>{c.colB}</div>
        </div>
        {ROWS.map(([m, a, u]) => (
          <div key={m} style={{ display: 'flex', padding: '10px 0', fontSize: 30, color: TEXT, borderTop: `1px solid ${RULE}` }}>
            <div style={{ display: 'flex', width: 440 }}>{m}</div>
            <div style={{ display: 'flex', width: 230, justifyContent: 'flex-end' }}>{a}</div>
            <div style={{ display: 'flex', width: 242, justifyContent: 'flex-end', fontWeight: 700, color: ACCENT }}>{u}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 44, fontSize: 22, color: MUTED }}>
        <div style={{ display: 'flex', color: TEXT, fontStyle: 'italic' }} lang={c.lang}>{c.foot}</div>
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
    const file = path.join(OUT_DIR, `fb-guessing-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
