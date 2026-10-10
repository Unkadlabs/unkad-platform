// Posters for "Does it even answer in Somali?" (Oct 2026), Somali and English.
// One bar per model: of 50 harmless Somali requests, how many answers came
// back in readable Somali, broken Somali, or another language. Numbers are
// read from the experiment's results/summary.json, never typed by hand.
// Pure white. Somali: !! VERIFY SOMALI !!
//
// Run: npx tsx scripts/poster-answer-language.tsx
// Out: ../dhiblabs/assets/promo/fb-answer-language-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');
const SUMMARY = path.join(os.homedir(), 'research', 'unkad-answer-language', 'results', 'summary.json');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', ACCENT = '#0F6B5C', SOFT = '#9CC7BE', RULE = '#E4E2DD';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

const NAMES: Record<string, string> = {
  'gpt-6-astra': 'GPT-6 Astra', 'gpt-5.6': 'GPT-5.6', 'llama3.3-70b-instruct': 'Llama 3.3 70B',
  'gemma2-9b-instruct': 'Gemma 2 9B', 'qwen2.5-7b-instruct': 'Qwen 2.5 7B', 'aya-23-8b': 'Aya 23 8B',
  'llama3.1-8b-instruct': 'Llama 3.1 8B',
};

type Row = { name: string; readable: number; broken: number; other: number };

// PREVIEW=1 renders placeholder bars into PREVIEW_DIR, stamped PREVIEW, for
// checking the design before the results exist. Never posted.
const PREVIEW = process.env.PREVIEW === '1';

function rows(): Row[] {
  if (PREVIEW) {
    return ['Model A', 'Model B', 'Model C', 'Model D', 'Model E', 'Model F', 'Model G'].map((name, i) => {
      const readable = 0.92 - i * 0.13;
      return { name, readable, broken: Math.min(1 - readable, 0.15 + i * 0.07), other: Math.max(0, 1 - readable - (0.15 + i * 0.07)) };
    });
  }
  const b = JSON.parse(fs.readFileSync(SUMMARY, 'utf8')).benign as Record<string, any>;
  return Object.entries(b)
    .map(([m, o]) => {
      const somaliish = ((o.langs.so ?? 0) + (o.langs.mixed ?? 0)) / o.n;
      const broken = (o.broken_of_somali ?? 0) * somaliish;
      return { name: NAMES[m] ?? m, readable: o.readable, broken, other: Math.max(0, 1 - o.readable - broken) };
    })
    .sort((x, y) => y.readable - x.readable);
}

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Cilmi-baaris Unkad Labs',
    head: 'Waxaan AI-ga kula hadalnay Af-Soomaali. Ma Af-Soomaali buu nagu soo celiyay?',
    sub: 'Jawaabaha 50 codsi oo Af-Soomaali ah oo aan waxyeello lahayn',
    keys: ['Af-Soomaali la fahmi karo', 'Af-Soomaali jaban', 'Luuqad kale'],
    foot: 'Oo la fahmi karo micnaheedu maaha inuu sax yahay.',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Unkad Labs research',
    head: 'We wrote to AI in Somali. Did it answer in Somali?',
    sub: 'Answers to 50 harmless requests written in Somali',
    keys: ['readable Somali', 'broken Somali', 'another language'],
    foot: 'And readable is not the same as right.',
  },
];

const BAR = 520;

function Poster({ c, data }: { c: (typeof COPY)[number]; data: Row[] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '96px 84px 80px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 16, fontSize: 46, fontWeight: 700, color: TEXT, lineHeight: 1.2 }} lang={c.lang}>{c.head.replace(/-/g, '\u2011')}</div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 26, color: MUTED }} lang={c.lang}>{c.sub}</div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {data.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: 250, fontSize: 28, color: TEXT }}>{r.name}</div>
            <div style={{ display: 'flex', width: BAR, height: 34 }}>
              <div style={{ display: 'flex', width: BAR * r.readable, backgroundColor: ACCENT }} />
              <div style={{ display: 'flex', width: BAR * r.broken, backgroundColor: SOFT }} />
              <div style={{ display: 'flex', width: BAR * r.other, backgroundColor: RULE }} />
            </div>
            <div style={{ display: 'flex', width: 142, justifyContent: 'flex-end', fontSize: 34, fontWeight: 700, color: ACCENT }}>
              {Math.round(r.readable * 100)}%
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 34, marginTop: 34, fontSize: 21, color: MUTED }} lang={c.lang}>
        {c.keys.map((k, i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', width: 18, height: 18, backgroundColor: [ACCENT, SOFT, RULE][i] }} />
            {k}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 24, color: MUTED }}>
        <div style={{ display: 'flex', color: TEXT, fontStyle: 'italic' }} lang={c.lang}>{c.foot}</div>
        <div style={{ display: 'flex' }}>unkad.com</div>
      </div>
      {PREVIEW && (
        <div style={{ position: 'absolute', top: 40, right: 60, display: 'flex', fontSize: 30, fontWeight: 700, color: '#C0392B' }}>PREVIEW · placeholder data</div>
      )}
    </div>
  );
}

async function main() {
  const data = rows();
  const outDir = PREVIEW ? process.env.PREVIEW_DIR! : OUT_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} data={data} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(outDir, `fb-answer-language-${c.lang}${PREVIEW ? '-preview' : ''}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB  (${data.length} models)`);
  }
}

main();
