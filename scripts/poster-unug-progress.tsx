// The honest progress poster (Aug 2026). White, minimal, one number.
// Most campaigns hide being at 0.6% of goal; this poster makes it the
// headline: 591 accepted of 100,000 — the rest is yours to write. The
// nearly-empty progress bar is the argument. Somali lines are drafts —
// !! VERIFY SOMALI !! — khalid reviews before posting.
//
// Run: npx tsx scripts/poster-unug-progress.tsx
// Out: ../dhiblabs/assets/promo/fb-unug-progress.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const BG = '#FCFBF8';
const TEXT = '#171715';
const MUTED = '#8A867E';
const FAINT = '#EFECE6';
const ACCENT = '#0F6B5C';

const ACCEPTED = 591;
const GOAL = 100_000;
const PCT = (ACCEPTED / GOAL) * 100; // 0.59%

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

function Seed({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="14" y="14" width="72" height="72" rx="16" fill={ACCENT} />
    </svg>
  );
}

function Poster() {
  const barW = 900;
  const fillW = Math.max(8, Math.round((PCT / 100) * barW));
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: BG,
        padding: '84px 84px 72px',
        fontFamily: 'Source Serif 4',
      }}
    >
      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Eyebrow — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          fontSize: 24,
          color: ACCENT,
          letterSpacing: '0.3em',
          fontWeight: 700,
        }}
      >
        RUNTA KAYDKA
      </div>

      {/* The number */}
      <div
        style={{
          display: 'flex',
          marginTop: 30,
          fontSize: 230,
          fontWeight: 700,
          color: TEXT,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        591
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 30, color: MUTED }} lang="so">
        jumladood oo la aqbalay, 100,000 ayaan u soconnaa
      </div>

      <div style={{ display: 'flex', flexGrow: 0.6 }} />

      {/* The nearly-empty bar */}
      <div style={{ display: 'flex', flexDirection: 'column', width: barW }}>
        <div
          style={{
            display: 'flex',
            width: barW,
            height: 22,
            backgroundColor: FAINT,
            borderRadius: 11,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: fillW,
              height: 22,
              backgroundColor: ACCENT,
              borderRadius: 11,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 14,
            fontSize: 24,
            color: MUTED,
          }}
        >
          <div style={{ display: 'flex', color: ACCENT, fontWeight: 700 }}>0.6%</div>
          <div style={{ display: 'flex' }}>100,000</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 0.6 }} />

      {/* The line — !! VERIFY SOMALI !! */}
      <div
        style={{
          display: 'flex',
          textAlign: 'center',
          fontSize: 34,
          color: TEXT,
          lineHeight: 1.55,
          maxWidth: 800,
          fontWeight: 700,
        }}
        lang="so"
      >
        99.4% inta kale, adigaa qoraya.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: ACCENT }}>
        qor.unkad.com
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 24,
          fontSize: 22, color: MUTED,
        }}
      >
        <Seed size={22} />
        <div style={{ display: 'flex' }}>Unkad Labs</div>
      </div>
    </div>
  );
}

async function main() {
  const resp = new ImageResponse(<Poster />, { width: 1080, height: 1350, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'fb-unug-progress.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
