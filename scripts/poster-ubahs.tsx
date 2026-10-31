// Unkad Labs at the UBAHS annual conference (Ururka Barayaasha Afka Hooyo ee
// Sweden), Thu 29 Oct 2026, slot "AI iyo shaqada macallinka". Somali for Facebook, English for LinkedIn and X.
// Co-branded: UBAHS logo (from their schedule PDF) in their navy, Unkad teal.
// The talk title and conference name are UBAHS's own wording; everything else
// is !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-ubahs.tsx
// Out: ../dhiblabs/assets/promo/fb-ubahs-so.png, -en.png (1080x1350; en for LinkedIn and X)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', ACCENT = '#0F6B5C', RULE = '#E4E2DD', NAVY = '#013066';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];
const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(OUT_DIR, 'ubahs-logo.png')).toString('base64')}`;

const COPIES = [{
  lang: 'so' as const,
  eyebrow: 'Khamiis, 29 Oktoobar 2026',
  head: 'Unkad Labs waxay ka qayb qaadatay Shirka iyo Siminaarka Sannadlaha ah 2026 ee macallimiinta Afka Hooyo ee Sweden.',
  talk: '«AI iyo shaqada macallinka»',
  shared: 'Waxaan la wadaagnay',
  items: [
    'Halka AI-gu ka caawin karo macallinka',
    'Halka uu Af-Soomaaliga ku khaldamo',
    'Badqabka ardayda marka ay AI isticmaalayaan',
  ],
  foot: 'Mahadsanid, macallimiinta Afka Hooyo.',
}, {
  lang: 'en' as const,
  eyebrow: 'Thursday, 29 October 2026',
  head: 'Unkad Labs spoke at the 2026 annual conference of Somali mother-tongue teachers in Sweden.',
  talk: 'AI and the teacher’s work',
  shared: 'What we shared',
  items: [
    'Where AI can help a teacher',
    'Where it gets Somali wrong',
    'Keeping students safe when they use AI',
  ],
  foot: 'Thank you, UBAHS.',
}];
type Copy = (typeof COPIES)[number];

function Poster({ c }: { c: Copy }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '72px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img src={LOGO} width={660} height={224} />
      </div>
      <div style={{ display: 'flex', height: 2, backgroundColor: RULE, margin: '28px 0 36px' }} />

      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 14, fontSize: 40, fontWeight: 700, color: TEXT, lineHeight: 1.25 }} lang={c.lang}>
        {c.head.split(' ').map((w, k) => <span key={k} style={{ marginRight: 11 }}>{w}</span>)}
      </div>
      <div style={{ display: 'flex', marginTop: 26, fontSize: 52, fontWeight: 700, color: ACCENT }} lang={c.lang}>{c.talk}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: MUTED, letterSpacing: '0.04em', marginBottom: 4 }} lang={c.lang}>{c.shared.toUpperCase()}</div>
      {c.items.map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'baseline', padding: '14px 0', borderTop: `${i === 0 ? 2 : 1}px solid ${RULE}` }}>
          <div style={{ display: 'flex', width: 70, fontSize: 26, fontWeight: 700, color: ACCENT }}>{`0${i + 1}`}</div>
          <div style={{ display: 'flex', fontSize: 30, color: TEXT }} lang={c.lang}>{t}</div>
        </div>
      ))}

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: NAVY, maxWidth: 760, lineHeight: 1.3 }} lang={c.lang}>{c.foot}</div>
        <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPIES) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-ubahs-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
