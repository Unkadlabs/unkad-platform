// "So far" poster (21 Sep 2026): 64 days of Qor, from the first sentence on
// 19 July to today. One line, the cumulative count of accepted sentences by
// week, with the milestones where they happened, then six numbers. Pure
// white, minimal. Somali and English. Data: production, read-only, pulled
// 21 Sep 2026 (scratch history.ts). Somali lines: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-qor-sofar.tsx
// Out: ../dhiblabs/assets/promo/fb-qor-sofar-so.png, -en.png (1080x1350)

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

// Cumulative accepted sentences at the end of each week (weeks start Saturday).
const WEEKS = [
  { d: '18 Jul', v: 4 },
  { d: '25 Jul', v: 2012 },
  { d: '1 Aug', v: 2489 },
  { d: '8 Aug', v: 2897 },
  { d: '15 Aug', v: 3244 },
  { d: '22 Aug', v: 3389 },
  { d: '29 Aug', v: 3683 },
  { d: '5 Sep', v: 3839 },
  { d: '12 Sep', v: 3913 },
  { d: '19 Sep', v: 4014 },
];
const MAX = 4300;
const CW = 912, CH = 300;
const px = (i: number) => (i / (WEEKS.length - 1)) * CW;
const py = (v: number) => CH - (v / MAX) * CH;
const line = WEEKS.map((w, i) => `${px(i).toFixed(1)},${py(w.v).toFixed(1)}`).join(' ');
const area = `0,${CH} ${line} ${CW},${CH}`;

type Copy = {
  lang: 'so' | 'en';
  eyebrow: string;
  headline: string;
  sub: string;
  stats: [string, string][];
  foot: string;
};

const COPY: Copy[] = [
  {
    lang: 'so',
    // sub, 'qof ayaa ku biiray' and the Hugging Face label: founder-verified 21 Sep 2026.
    // Other labels still !! VERIFY SOMALI !!
    eyebrow: '19 Luulyo ilaa 21 Sebtembar 2026',
    headline: '64 maalmood',
    sub: 'jumladood oo af-soomali ah oo la hubiyay',
    stats: [
      ['585', 'qof ayaa ku biiray'],
      ['178', 'qof oo qoray'],
      ['152', 'qof oo hubiyay'],
      ['1,740', 'codadka hubinta'],
      ['8', 'kaydad la daabacay'],
      ['3,629', 'jumladood oo hugging face yaala'],
    ],
    foot: '',
  },
  {
    lang: 'en',
    eyebrow: '19 July to 21 September 2026',
    headline: '64 days',
    sub: 'validated Somali sentences, written by Somali speakers',
    stats: [
      ['585', 'people joined'],
      ['178', 'wrote'],
      ['152', 'validated'],
      ['1,740', 'validation votes'],
      ['8', 'corpus releases'],
      ['3,629', 'sentences on Hugging Face'],
    ],
    foot: '',
  },
];

function Poster({ c }: { c: Copy }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 76px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>{c.eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 60, fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' }} lang={c.lang}>
        {c.headline}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 190, fontWeight: 700, color: TEXT, lineHeight: 0.95, letterSpacing: '-0.04em' }}>4,014</div>
      <div style={{ display: 'flex', marginTop: 22, fontSize: 30, color: TEXT, lineHeight: 1.35, maxWidth: 860 }} lang={c.lang}>
        {c.sub}
      </div>

      <div style={{ display: 'flex', position: 'relative', width: CW, height: CH, marginTop: 44 }}>
        <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <polygon points={area} fill={ACCENT} fillOpacity="0.07" />
          <polyline points={line} fill="none" stroke={ACCENT} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={px(WEEKS.length - 1)} cy={py(4014)} r="8" fill={ACCENT} />
        </svg>
        <div style={{ display: 'flex', position: 'absolute', left: 0, top: CH + 10, fontSize: 20, color: MUTED }}>19 Jul</div>
        <div style={{ display: 'flex', position: 'absolute', right: 0, top: CH + 10, fontSize: 20, color: MUTED }}>21 Sep</div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `2px solid ${RULE}`, marginTop: 40 }}>
        {c.stats.map(([n, label]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', width: '33.33%', padding: '20px 0 6px' }}>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' }}>{n}</div>
            <div style={{ display: 'flex', fontSize: 20, color: MUTED, marginTop: 2 }} lang={c.lang}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, fontSize: 22, color: MUTED }}>
        <div style={{ display: 'flex', color: TEXT, fontStyle: 'italic' }} lang={c.lang}>{c.foot}</div>
        <div style={{ display: 'flex' }}>qor.unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-qor-sofar-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
