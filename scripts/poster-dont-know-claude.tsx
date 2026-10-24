// Claude follow-up to poster-dont-know.tsx (Oct 2026), Somali and English.
// Same 27 Somali poems and events that do not exist: each of three Claude
// models said "I don't know" 27 of 27 times, in Somali and in English.
// Numbers from ~/research/unkad-fabrication/results/summary-claude.json.
// Pure white. Somali: the headline and unit reuse founder-verified wording;
// the rest is !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-dont-know-claude.tsx
// Out: ../dhiblabs/assets/promo/fb-dont-know-claude-so.png, -en.png (1080x1350)

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

const MODELS = ['Claude Opus 5.5', 'Claude Sonnet 5.5', 'Claude Haiku 5.5'];

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Cilmi-baaris Unkad Labs',
    head: 'Waxaan Claude weydiinay 27 gabay iyo dhacdo Soomaaliyeed oo aan jirin.',
    unit: 'jeer ayuu yiri «Ma aqaan», Af-Soomaali',
    cols: ['Af-Soomaali', 'Ingiriisi'],
    foot: 'Waxba ma sameysan. AI-gu wuxuu dhihi karaa «ma aqaan» Af-Soomaali.',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Unkad Labs research',
    head: 'We asked Claude about 27 Somali poems and events that never existed.',
    unit: 'times it said \u201cI don\u2019t know\u201d, asked in Somali',
    cols: ['Somali', 'English'],
    foot: 'Nothing invented. AI can say \u201cI don\u2019t know\u201d in Somali.',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 16, fontSize: 46, fontWeight: 700, color: TEXT, lineHeight: 1.2 }} lang={c.lang}>
        {c.head.split(' ').map((w, k) => <span key={k} style={{ marginRight: 12 }}>{w}</span>)}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 280, fontWeight: 700, color: ACCENT, lineHeight: 1, letterSpacing: '-0.04em' }}>27</div>
        <div style={{ display: 'flex', fontSize: 64, color: MUTED, marginLeft: 12 }}>/27</div>
      </div>
      <div style={{ display: 'flex', marginTop: 6, fontSize: 30, color: TEXT }} lang={c.lang}>{c.unit}</div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, borderTop: `2px solid ${RULE}` }}>
        <div style={{ display: 'flex', padding: '12px 0 4px', fontSize: 20, color: MUTED }} lang={c.lang}>
          <div style={{ display: 'flex', width: 480 }} />
          <div style={{ display: 'flex', width: 216, justifyContent: 'flex-end' }}>{c.cols[0]}</div>
          <div style={{ display: 'flex', width: 216, justifyContent: 'flex-end' }}>{c.cols[1]}</div>
        </div>
        {MODELS.map((m) => (
          <div key={m} style={{ display: 'flex', padding: '10px 0', fontSize: 30, color: TEXT, borderTop: `1px solid ${RULE}` }}>
            <div style={{ display: 'flex', width: 480 }}>{m}</div>
            <div style={{ display: 'flex', width: 216, justifyContent: 'flex-end', fontWeight: 700, color: ACCENT }}>27/27</div>
            <div style={{ display: 'flex', width: 216, justifyContent: 'flex-end', color: MUTED }}>27/27</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: ACCENT, maxWidth: 780, lineHeight: 1.3 }} lang={c.lang}>{c.foot}</div>
        <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-dont-know-claude-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
