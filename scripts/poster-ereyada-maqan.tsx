// Posters for "Ereyada maqan" (the missing words), Nov 2026, Somali and English.
// The hook: Qor holds 13,912 different words, and not one is "shaah".
//
// Data, checked 19 Nov 2026:
//   13,912 = distinct words in the RELEASED corpus v0.4.0 (lib/words.ts).
//   "shaah": 0 in every accepted Qor sentence, released or not (1 pending).
//   Oktoobar, madaxweyne, qalinka, telefoon: 0 in the released corpus.
// The empty dashed slot is the visual: a place in the corpus with no word in it.
// Pure white social palette. !! VERIFY SOMALI !! (all Somali lines are drafts).
//
// Run: npx tsx scripts/poster-ereyada-maqan.tsx
// Out: ../dhiblabs/assets/promo/fb-ereyada-maqan-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', ACCENT = '#0F6B5C', RULE = '#E4E2DD';
const SOFT = 'rgba(15, 107, 92, 0.06)';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

const WORDS = 13912;
const ALSO = ['Oktoobar', 'madaxweyne', 'qalinka', 'telefoon'];

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Qor Af-Soomaali · Unkad Labs',
    lead: 'Kaydka Qor wuxuu leeyahay',
    unit: 'erey oo kala duwan.',
    mid: 'Midkoodna ma aha',
    also: 'Weli kuma jiraan:',
    foot: 'Ku dar jumlad: qor.unkad.com/maqan',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Qor Af-Soomaali · Unkad Labs',
    lead: 'The Qor corpus holds',
    unit: 'different Somali words.',
    mid: 'Not one of them is',
    also: 'Also never seen:',
    foot: 'Add a sentence: qor.unkad.com/maqan',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '92px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>{c.eyebrow}</div>

      <div style={{ display: 'flex', marginTop: 40, fontSize: 38, color: TEXT }} lang={c.lang}>{c.lead}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, marginTop: 4 }}>
        <div style={{ display: 'flex', fontSize: 168, fontWeight: 700, color: TEXT, lineHeight: 1, letterSpacing: '-0.04em' }}>
          {WORDS.toLocaleString('en-US')}
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 38, color: TEXT, marginTop: 8 }} lang={c.lang}>{c.unit}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: TEXT }} lang={c.lang}>{c.mid}</div>
      {/* The empty slot: dashed, unfilled, with the word sitting in it. */}
      <div
        style={{
          display: 'flex', alignSelf: 'flex-start', marginTop: 18, padding: '18px 48px 30px',
          border: `5px dashed ${ACCENT}`, borderRadius: 26, backgroundColor: SOFT,
        }}
      >
        <div style={{ display: 'flex', fontSize: 190, fontWeight: 700, color: ACCENT, lineHeight: 1, letterSpacing: '-0.03em' }} lang="so">
          shaah
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', borderTop: `2px solid ${RULE}`, paddingTop: 26, flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 26, color: MUTED }} lang={c.lang}>{c.also}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 14 }}>
          {ALSO.map((w) => (
            <div
              key={w}
              style={{ display: 'flex', fontSize: 32, color: TEXT, padding: '8px 22px', border: `2px dashed ${RULE}`, borderRadius: 14 }}
              lang="so"
            >
              {w}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, fontSize: 26, color: MUTED }}>
        <div style={{ display: 'flex', color: ACCENT, fontWeight: 700 }} lang={c.lang}>{c.foot}</div>
        <div style={{ display: 'flex', fontSize: 22 }}>unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-ereyada-maqan-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
