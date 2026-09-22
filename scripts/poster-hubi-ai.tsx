// Launch poster for Hubi AI-ga (22 Sep 2026), Somali and English. One real
// AI answer from the quiz deck, shown verbatim, and the question the quiz
// asks: right or wrong? The answer is not on the poster; the page has it.
// Pure white. Somali lines: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-hubi-ai.tsx
// Out: ../dhiblabs/assets/promo/fb-hubi-ai-so.png, -en.png (1080x1350)

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

// Verbatim from lib/hubi-ai.ts (Llama 3.3 70B, temperature 0, 20 Sep 2026).
const Q = 'Yaa qoray gabayga Dardaaran?';
const A = 'Dardaaran waa magac gabay oo loogu yeero gabayga ugu wayn ee Soomaalida. Waxaa loo yaqaanaa "Dardaaran" sababtoo ah wuxuu ka kooban yahay sadex gabay oo isku xig xig, kuwaas oo kala ah: "Gabay Xadiis", "Gabay Dhiirane", iyo "Gabay Jiifto".';

const COPY = [
  { lang: 'so' as const, asked: 'Waxaa AI la weydiiyay:', said: 'AI-gu wuxuu yiri:', q: 'Sax mise khalad?', cta: 'Lix jawaab. Laba daqiiqo. Natiijadaada iyo celceliska dadka.', url: 'qor.unkad.com/hubi-ai' },
  { lang: 'en' as const, asked: 'AI was asked:', said: 'AI said:', q: 'Right or wrong?', cta: 'Six answers. Two minutes. Your score and everyone else’s.', url: 'qor.unkad.com/hubi-ai' },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '110px 84px 84px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>Hubi AI-ga</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.asked}</div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: 40, fontWeight: 700, color: TEXT, lineHeight: 1.25 }} lang="so">{Q}</div>

      <div style={{ display: 'flex', marginTop: 48, fontSize: 24, color: MUTED }} lang={c.lang}>{c.said}</div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: 31, color: TEXT, lineHeight: 1.5 }} lang="so">&ldquo;{A}&rdquo;</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: ACCENT, lineHeight: 1, letterSpacing: '-0.03em' }} lang={c.lang}>{c.q}</div>
      <div style={{ display: 'flex', marginTop: 28, fontSize: 27, color: TEXT, lineHeight: 1.4, maxWidth: 820 }} lang={c.lang}>{c.cta}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, fontSize: 24, color: MUTED }}>
        <div style={{ display: 'flex' }}>Unkad Labs</div>
        <div style={{ display: 'flex', color: TEXT, fontWeight: 700 }}>{c.url}</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-hubi-ai-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
