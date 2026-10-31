// Unkad Labs presented its Somali AI safety work to the African Hub on AI
// Safety, Peace and Security (UCT) on 27 Oct 2026. Somali and English.
// Text only: no Hub or UCT logo, no names of people, until the Hub agrees.
// Pure white. All Somali is !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-uct-hub.tsx
// Out: ../dhiblabs/assets/promo/fb-uct-hub-so.png, -en.png (1080x1350)

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

const HUB = 'African Hub on AI Safety, Peace and Security';

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Unkad Labs · 27 Oktoobar 2026',
    head: 'Shaqadayada badqabka AI-ga ee Af-Soomaaliga waxaan u soo bandhignay',
    where: 'Jaamacadda Cape Town',
    shared: 'Waxaan la wadaagnay',
    items: [
      ['SomaliBench', 'AI-gu wuu diidaa codsiga khatarta ah marka Ingiriisi la weydiiyo, Af-Soomaali se badanaa ma diido.'],
      ['«Ma aqaan»', 'Moodalada yaryar waxay sameeyaan gabayo iyo dhacdooyin aan jirin.'],
      ['AI-ga qalabka isticmaala', 'Tijaabooyin cusub oo Af-Soomaali ah, weli socda.'],
    ],
    foot: 'Badqabka AI-ga waa inuu Af-Soomaali ku shaqeeyaa.',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Unkad Labs · 27 October 2026',
    head: 'We presented our Somali safety work to the',
    where: 'University of Cape Town',
    shared: 'What we shared',
    items: [
      ['SomaliBench', 'AI that refuses harmful requests in English often complies in Somali.'],
      ['“I don’t know”', 'Small models invent Somali poems and events that never existed.'],
      ['AI with tools', 'New Somali agentic evaluations, work in progress.'],
    ],
    foot: 'AI safety has to work in Somali too.',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 20, fontSize: 40, color: TEXT, lineHeight: 1.25 }} lang={c.lang}>
        {c.head.split(' ').map((w, k) => <span key={k} style={{ marginRight: 11 }}>{w}</span>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 18, fontSize: 60, fontWeight: 700, color: ACCENT, lineHeight: 1.1 }}>
        {HUB.split(' ').map((w, k) => <span key={k} style={{ marginRight: 16 }}>{w}</span>)}
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 30, color: TEXT }} lang={c.lang}>{c.where}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: MUTED, letterSpacing: '0.04em', marginBottom: 4 }} lang={c.lang}>{c.shared.toUpperCase()}</div>
      {c.items.map(([t, d], i) => (
        <div key={t} style={{ display: 'flex', padding: '18px 0', borderTop: `${i === 0 ? 2 : 1}px solid ${RULE}` }}>
          <div style={{ display: 'flex', width: 70, fontSize: 26, fontWeight: 700, color: ACCENT }}>{`0${i + 1}`}</div>
          <div style={{ display: 'flex', flexDirection: 'column', width: 840 }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: TEXT }} lang={c.lang}>{t}</div>
            <div style={{ display: 'flex', marginTop: 4, fontSize: 24, color: MUTED, lineHeight: 1.35 }} lang={c.lang}>{d}</div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: ACCENT, maxWidth: 780, lineHeight: 1.3 }} lang={c.lang}>{c.foot}</div>
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
    const file = path.join(OUT_DIR, `fb-uct-hub-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
