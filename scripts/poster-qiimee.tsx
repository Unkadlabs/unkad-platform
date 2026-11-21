// Launch poster for the public blind vote, qor.unkad.com/qiimee (Nov 2026).
// Somali and English. Three real essay openings (set s24, the shaah topic,
// exactly as voters see them) fading out, the two vote buttons beneath, and
// the link. Nothing says which model or condition wrote which essay.
//
// Somali: every line is from strings the founder verified on 21 Nov 2026
// (lib/i18n.ts: qTitle, the first sentence of qIntro, qBest, qWorst, part of
// qWhy, qClosesAt). The essay text is AI output shown verbatim.
// Pure white social palette.
//
// Run: npx tsx scripts/poster-qiimee.tsx
// Out: ../dhiblabs/assets/promo/fb-qiimee-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';
import sets from '../lib/data/blind-sets.json';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', ACCENT = '#0F6B5C', RULE = '#E4E2DD', RED = '#A03D2E';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

const SET = (sets as { id: string; essays: string[] }[]).find((s) => s.id === 's24')!;
const openings = SET.essays.map((e) => e.trim().split('\n')[0].slice(0, 230));

const COPY = [
  {
    lang: 'so' as const,
    title: 'Qoraalkee Af-Soomaaligiisu wanaagsanyahay?',
    sub: 'Saddexdan qoraal oo isku mawduuc ah waxaa qoray AI (Garaag gacmeed).',
    essay: 'QORAAL',
    best: 'Ugu dabiicsan',
    worst: 'Ugu liita',
    foot: 'Ma u baahnid akoon. Codbixintu waxay xirmaysaa Khamiista, 26 Nofembar.',
  },
  {
    lang: 'en' as const,
    title: 'Which essay has the better Somali?',
    sub: 'Three short essays on the same topic, written by AI.',
    essay: 'ESSAY',
    best: 'Most natural',
    worst: 'Least natural',
    foot: 'No account needed. Voting closes Thursday, 26 November.',
  },
];

function Poster({ c }: { c: (typeof COPY)[number] }) {
  // Keep a date and a two-word name on one line (display only; wording unchanged).
  const nb = (t: string) => t.replace(/26 (Nofembar|November)/, '26\u00a0$1').replace('Garaag gacmeed', 'Garaag\u00a0gacmeed');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '84px 72px 72px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>Qor Af-Soomaali · Unkad Labs</div>
      <div style={{ display: 'flex', marginTop: 22, fontSize: 64, fontWeight: 700, color: TEXT, lineHeight: 1.12, letterSpacing: '-0.01em' }} lang={c.lang}>
        {c.title.replace(/-/g, '‑')}
      </div>
      <div style={{ display: 'flex', marginTop: 20, fontSize: 30, color: TEXT, lineHeight: 1.35 }} lang={c.lang}>
        {nb(c.sub)}
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 52 }}>
        {openings.map((text, i) => (
          <div
            key={i}
            style={{
              display: 'flex', flexDirection: 'column', flex: 1, height: 470, position: 'relative', overflow: 'hidden',
              border: `2px solid ${RULE}`, borderRadius: 18, padding: '22px 22px 0',
            }}
          >
            <div style={{ display: 'flex', fontSize: 18, letterSpacing: '0.12em', color: MUTED }}>{`${c.essay} ${'ABC'[i]}`}</div>
            <div style={{ display: 'flex', marginTop: 14, fontSize: 23, lineHeight: 1.55, color: TEXT }} lang="so">
              {text}
            </div>
            {/* Fade the essay out: the reader has to open the page to finish it. */}
            <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, bottom: 0, height: 210, backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0), #FFFFFF 85%)' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 34, justifyContent: 'center' }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#FFFFFF', backgroundColor: ACCENT, padding: '14px 34px', borderRadius: 999 }} lang={c.lang}>
          {c.best}
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: RED, border: `3px solid ${RED}`, padding: '11px 31px', borderRadius: 999 }} lang={c.lang}>
          {c.worst}
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', borderTop: `2px solid ${RULE}`, paddingTop: 26, flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: ACCENT }}>qor.unkad.com/qiimee</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 30 }}>
          <div style={{ display: 'flex', fontSize: 25, color: TEXT, maxWidth: 800, lineHeight: 1.35 }} lang={c.lang}>{nb(c.foot)}</div>
          <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>unkad.com</div>
        </div>
      </div>
    </div>
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const c of COPY) {
    const resp = new ImageResponse(<Poster c={c} />, { width: 1080, height: 1350, fonts });
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = path.join(OUT_DIR, `fb-qiimee-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
