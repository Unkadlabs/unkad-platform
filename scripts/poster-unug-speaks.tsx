// "Unug hadlay" — the baby model poster (Aug 2026).
//
// Unug is a 873K-parameter model trained from scratch on ONLY the community
// corpus. It babbles Somali-shaped nonsense. The poster shows the babble,
// real and unretouched, and asks the community to feed it. All Somali copy
// is draft — !! VERIFY SOMALI !! — khalid reviews before posting. The babble
// itself is machine output and needs no verification; it is the point.
//
// Run: npx tsx scripts/poster-unug-speaks.tsx
// Out: ../dhiblabs/assets/promo/fb-unug-speaks.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const C = {
  bg: '#141312',
  text: '#E8E6E1',
  muted: '#A5A19A',
  accent: '#4DB6A5',
  rule: '#2E2C29',
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

// Unug's real output, unretouched (seed 42, temp 0.8, prompt "Waxaan").
const BABBLE =
  'Waxaan lahayn. Wuxuu wuq bisbaa in haddan ah, kaa halaan, laakiin. Faddii waa beerahed ugu darii aad oo ugu dhabto ah banuug markaasii ah.';

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
          marginTop: 64,
          fontSize: 24,
          color: C.accent,
          letterSpacing: '0.22em',
        }}
      >
        UNUG · AI YAR OO SOOMAALI BARANAYA
      </div>

      {/* Headline — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          marginTop: 18,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.18,
          color: C.text,
          letterSpacing: '-0.01em',
        }}
      >
        Waxaan dhisnay AI yar. Waxaan barnay wixii aad qorteen. Wuu hadlay:
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* The babble, quoted */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderLeft: `3px solid ${C.accent}`,
          paddingLeft: 34,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 37,
            fontStyle: 'italic',
            lineHeight: 1.5,
            color: C.text,
          }}
          lang="so"
        >
          “{BABBLE}”
        </div>
        <div style={{ display: 'flex', marginTop: 18, fontSize: 23, color: C.muted }}>
          — Unug, 873,728 parameters, trained only on qor.unkad.com
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* The ask — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          fontSize: 29,
          color: C.muted,
          lineHeight: 1.5,
        }}
      >
        Wali micne ma leh, wuxuu baranayaa qaabka kaliya. Si uu u hadlo Soomaali dhab
        ah, wuxuu u baahan yahay jumlado aad ka badan. Adiga ayuu ku sugayaa.
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: 44,
          borderTop: `1px solid ${C.rule}`,
          paddingTop: 30,
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: C.accent }}>
          qor.unkad.com
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: C.muted }}>
          Unkad — creation from nothing
        </div>
      </div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'fb-unug-speaks.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
