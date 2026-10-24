// Frontier vs small open models (Oct 2026), Somali and English.
// Same 27 Somali poems and events that do not exist, asked in Somali: how many
// times each model said "I don't know". Claude numbers from
// unkad-fabrication/results/summary-claude.json, small models from the first
// study (results/summary.json, same items, same exclusions).
// Pure white. Somali: headline and unit reuse founder-verified wording; group
// labels and foot are !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-dont-know-frontier.tsx
// Out: ../dhiblabs/assets/promo/fb-dont-know-frontier-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', ACCENT = '#0F6B5C', RULE = '#E4E2DD', SOFT = '#B9B5AD';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

// "I don't know" in Somali, out of 27.
const FRONTIER: [string, number][] = [['Claude Opus 5.5', 27], ['Claude Sonnet 5.5', 27], ['Claude Haiku 5.5', 27]];
const SMALL: [string, number][] = [['Qwen 2.5 7B', 5], ['Aya 23 8B', 3], ['Gemma 2 9B', 1], ['Llama 3.1 8B', 0]];

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Cilmi-baaris Unkad Labs',
    head: 'AI-ga horumarsan wuu garanayaa waxa uusan aqoon. Xitaa Af-Soomaali.',
    unit: '27 gabay iyo dhacdo Soomaaliyeed oo aan jirin, Af-Soomaali lagu weydiiyay. Inta jeer ee uu yiri «Ma aqaan»:',
    g1: 'Moodooyinka waaweyn (frontier)',
    g2: 'Moodooyinka yaryar ee furan',
    foot: 'AI-ga yar wuu sameystaa. AI-ga weyn wuxuu yiraahdaa «ma aqaan».',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Unkad Labs research',
    head: 'Frontier AI knows when it doesn’t know. Even in Somali.',
    unit: '27 Somali poems and events that never existed, asked in Somali. Times each model said “I don’t know”:',
    g1: 'Frontier models',
    g2: 'Small open models',
    foot: 'Small models invent. Frontier models say “I don’t know”.',
  },
];

const BAR = 470;

function Row({ name, n, color }: { name: string; n: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '7px 0' }}>
      <div style={{ display: 'flex', width: 290, fontSize: 27, color: TEXT }}>{name}</div>
      <div style={{ display: 'flex', width: BAR, height: 30, backgroundColor: '#F4F3F0' }}>
        <div style={{ display: 'flex', width: Math.max(BAR * n / 27, 4), height: 30, backgroundColor: color }} />
      </div>
      <div style={{ display: 'flex', width: 152, justifyContent: 'flex-end', fontSize: 32, fontWeight: 700, color }}>{n}</div>
    </div>
  );
}

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 16, fontSize: 56, fontWeight: 700, color: TEXT, lineHeight: 1.15 }} lang={c.lang}>
        {c.head.split(' ').map((w, k) => <span key={k} style={{ marginRight: 12 }}>{w}</span>)}
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 24, color: MUTED, lineHeight: 1.4, maxWidth: 900 }} lang={c.lang}>{c.unit}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: ACCENT, letterSpacing: '0.04em', marginBottom: 6 }} lang={c.lang}>{c.g1.toUpperCase()}</div>
      {FRONTIER.map(([m, n]) => <Row key={m} name={m} n={n} color={ACCENT} />)}

      <div style={{ display: 'flex', height: 2, backgroundColor: RULE, margin: '26px 0 18px' }} />

      <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: MUTED, letterSpacing: '0.04em', marginBottom: 6 }} lang={c.lang}>{c.g2.toUpperCase()}</div>
      {SMALL.map(([m, n]) => <Row key={m} name={m} n={n} color={MUTED} />)}

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
    const file = path.join(OUT_DIR, `fb-dont-know-frontier-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
