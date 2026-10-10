// "Three checks before you trust an AI answer" (Oct 2026), Somali and English.
// A practical safety card, no data: each check is grounded in something the
// lab has shown (the invented Dardaaran poems, the meaningless malaria answer).
// Pure white. Somali: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-three-checks.tsx
// Out: ../dhiblabs/assets/promo/fb-three-checks-so.png, -en.png (1080x1350)

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
    eyebrow: 'Badqabka AI-ga · Unkad Labs',
    head: 'Saddex shay ka hor intaadan rumaysan jawaabta AI-ga',
    checks: [
      ['Fasiix maaha sax.', 'AI-gu si fasiix ah ayuu u sheegi karaa wax aan jirin.'],
      ['Caafimaadka, dad weydii.', 'Su’aalaha caafimaadka iyo daawada, AI-ga keligiis ha ku kalsoonaan.'],
      ['Meel kale ka hubi.', 'Wixii muhiim ah, ka hubi il kale ka hor intaadan ku dhaqmin.'],
    ],
    foot: 'Isku day: qor.unkad.com/hubi-ai',
  },
  {
    lang: 'en' as const,
    eyebrow: 'AI safety · Unkad Labs',
    head: 'Three checks before you trust an AI answer',
    checks: [
      ['Fluent is not right.', 'AI can describe things that do not exist, fluently.'],
      ['Health questions go to people.', 'For health and medicine, never rely on AI alone.'],
      ['Check a second source.', 'Anything important, confirm it somewhere else before you act on it.'],
    ],
    foot: 'Test yourself: qor.unkad.com/hubi-ai',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 54, fontWeight: 700, color: TEXT, lineHeight: 1.15 }} lang={c.lang}>
        {c.head.replace(/-/g, '‑')}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {c.checks.map(([title, body], i) => (
          <div key={title} style={{ display: 'flex', alignItems: 'flex-start', padding: '30px 0', borderTop: `2px solid ${RULE}` }}>
            <div style={{ display: 'flex', width: 120, fontSize: 96, fontWeight: 700, color: ACCENT, lineHeight: 0.9 }}>{i + 1}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }} lang={c.lang}>
              <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{title}</div>
              <div style={{ display: 'flex', marginTop: 10, fontSize: 27, color: MUTED, lineHeight: 1.4 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 24, color: MUTED }}>
        <div style={{ display: 'flex', color: ACCENT, fontWeight: 700 }} lang={c.lang}>{c.foot}</div>
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
    const file = path.join(OUT_DIR, `fb-three-checks-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
