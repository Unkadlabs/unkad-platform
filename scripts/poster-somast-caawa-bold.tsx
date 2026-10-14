// "Tonight" poster, bold variant: the time is the hero. Somast x Unkad Labs,
// Wed 14 Oct 2026. QR goes straight into the Meet. Pure white.
// Somali: !! VERIFY SOMALI !! ("Caawa", "fiidnimo", "Ku soo biir").
//
// Run: npx tsx scripts/poster-somast-caawa-bold.tsx
// Out: ../dhiblabs/assets/promo/fb-somast-caawa-bold-so.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, '..', 'dhiblabs');
const FONTS_DIR = path.join(SITE, 'assets', 'fonts');
const OUT = path.join(SITE, 'assets', 'promo', 'fb-somast-caawa-bold-so.png');
const SOMAST_LOGO = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(SITE, 'assets', 'partners', 'somast', 'somast-logo-2026-10.svg')).toString('base64');
const QR = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(SITE, 'assets', 'promo', 'qr-meet.svg')).toString('base64');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', RULE = '#E4E2DD';
const UNKAD = '#0F6B5C', SOMAST = '#117B72';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];
const CELLS = [[38, 70, true], [6, 70], [70, 70], [6, 38], [70, 38], [6, 6], [70, 6]] as const;

function Poster() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '80px 84px 72px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: 1 }}><img src={SOMAST_LOGO} width={177} height={53} /></div>
        <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>×</div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <svg width={40} height={40} viewBox="0 0 100 100">
            {CELLS.map(([x, y, seed]) => <rect key={`${x}-${y}`} x={x} y={y} width={24} height={24} fill={seed ? UNKAD : TEXT} />)}
          </svg>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: TEXT }}>Unkad Labs</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 120, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: '-0.03em' }} lang="so">Caawa</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 4 }}>
        <div style={{ display: 'flex', fontSize: 330, fontWeight: 700, color: UNKAD, lineHeight: 0.9, letterSpacing: '-0.05em' }}>8:00</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 34, color: MUTED, lineHeight: 1.25 }} lang="so">
          <div style={{ display: 'flex' }}>fiidnimo</div>
          <div style={{ display: 'flex' }}>(EAT)</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 40, fontSize: 52, fontWeight: 700, color: TEXT, lineHeight: 1.1 }} lang="so">
        {'AI-ga iyo Af-Soomaaliga'.split(' ').map((w, k) => <span key={k} style={{ marginRight: 16 }}>{w}</span>)}
      </div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 30, color: TEXT }} lang="so">Waxa uu ku qaban karo iyo halka uu ka khaldamo</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${RULE}`, paddingTop: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} lang="so">
          <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>Arbaco, 14-ka Oktoobar · Google Meet</div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: UNKAD }}>Ku soo biir:</div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: UNKAD }}>meet.google.com/cuh-bmox-gwr</div>
        </div>
        <img src={QR} width={190} height={190} />
      </div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(OUT, buf);
  console.log(`${OUT}  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
