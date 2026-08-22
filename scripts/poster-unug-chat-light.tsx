// "Unug's first answer" — the chat poster (Aug 20, 2026).
//
// Unug (873K params, wiki-pretrained, Qor-finetuned, instruction-tuned on
// 413 verified community pairs) answered its first question today. The
// poster shows the real exchange as a chat: asked to translate "Where is
// the market?", it opens with what looks like the right translation, then
// dissolves into babble. Output is raw and unretouched; that honesty IS the
// poster. All Somali copy is draft — !! VERIFY SOMALI !! — khalid reviews
// before posting. The model output itself is machine text, shown as such.
//
// Run: npx tsx scripts/poster-unug-chat.tsx
// Out: ../dhiblabs/assets/promo/fb-unug-chat-light.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

// Light variant. Tokens taken from the site's :root light palette so the
// poster matches unkad.com rather than inventing a second paper colour.
// The accent darkens from #4DB6A5 to #0F6B5C: the light teal is legible on
// near-black but fails contrast on paper, and the question bubble uses it as
// a fill with text on top.
const C = {
  bg: '#FCFBF8',
  text: '#1A1917',
  muted: '#6B6862',
  accent: '#0F6B5C',
  rule: '#E5E2DA',
  bubble: '#F1EFE9',
};

const fonts = [
  {
    name: 'Source Serif 4',
    data: fs.readFileSync(path.join(FONTS_DIR, 'SourceSerif4-Regular.otf')),
    weight: 400 as const,
    style: 'normal' as const,
  },
  {
    name: 'Source Serif 4',
    data: fs.readFileSync(path.join(FONTS_DIR, 'SourceSerif4-Bold.otf')),
    weight: 700 as const,
    style: 'normal' as const,
  },
];

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={C.accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={C.text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={C.text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={C.text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={C.text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={C.text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={C.text} />
    </svg>
  );
}

// Real exchange from scripts/chat_demo.py, unretouched (seed 11, temp 0.7).
const QUESTION =
  'Turjun jumladan Ingiriisiga ah una beddel Af-Soomaali. “Where is the market?”';
const ANSWER_HIT = 'Waa xaggee suuqa';
const ANSWER_REST =
  ' ugu horeyn farfaha ayaa ka wadaagta cusub. Waa aan kaa qorin kooban oo ku saabsan mudo ku wareeg tayo aragtiyo';

function Poster() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.bg,
        padding: '76px 84px',
        fontFamily: 'Source Serif 4',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Mark size={54} />
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.text }}>
          Unkad Labs
        </div>
      </div>

      {/* Eyebrow */}
      <div
        style={{
          display: 'flex',
          marginTop: 56,
          fontSize: 24,
          color: C.accent,
          letterSpacing: '0.22em',
        }}
      >
        UNUG · AI YAR OO SOOMAALIGA BARANAYA
      </div>

      {/* Headline — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          marginTop: 18,
          fontSize: 58,
          fontWeight: 700,
          lineHeight: 1.18,
          color: C.text,
          letterSpacing: '-0.01em',
        }}
      >
        Maanta ayuu Unug su&rsquo;aashii ugu horreysay ka jawaabay.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Chat: question bubble, right-aligned */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            display: 'flex',
            maxWidth: 780,
            backgroundColor: C.accent,
            color: '#FFFFFF',
            fontSize: 30,
            lineHeight: 1.45,
            padding: '26px 32px',
            borderRadius: 26,
            borderBottomRightRadius: 6,
          }}
          lang="so"
        >
          {QUESTION}
        </div>
      </div>

      {/* Chat: Unug bubble, left-aligned */}
      <div style={{ display: 'flex', marginTop: 30 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 820,
            backgroundColor: C.bubble,
            padding: '26px 32px',
            borderRadius: 26,
            borderBottomLeftRadius: 6,
          }}
        >
          <div style={{ display: 'flex', fontSize: 22, color: C.muted, marginBottom: 10 }}>
            Unug · 873,728 parameters
          </div>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', fontSize: 30, lineHeight: 1.5, color: C.muted }}
            lang="so"
          >
            <span style={{ color: C.accent, fontWeight: 700 }}>{ANSWER_HIT}</span>
            <span>{ANSWER_REST}&hellip;</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* The honest read — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          fontSize: 28,
          color: C.muted,
          lineHeight: 1.5,
        }}
      >
        Bilowga waa xusuusasho: su&rsquo;aalo suuqa la mid ah ayuu tababarka ku arkay,
        wuuna xusuustay. Inta kale waa qaylo. Wuxuu wax ka bartay Wikipedia
        Soomaaliga iyo jumladihii aad ku qorteen qor.unkad.com. Jumlad kasta oo
        cusub waxay saxaysaa jawaabaha nooca oo kale ah. aad oo arkayso inaysan
        saxneen
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: 40,
          borderTop: `1px solid ${C.rule}`,
          paddingTop: 30,
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.accent }}>
          qor.unkad.com
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: C.muted }}>
          Sida uu u soo saaray oo aan wax laga bedelin
        </div>
      </div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'fb-unug-chat-light.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
