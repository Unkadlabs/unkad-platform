// "Unug mise Qof?" — game launch poster (Aug 2026). Ultra-minimal, white,
// per the standing rule. The poster IS one round of the game: a sentence,
// two buttons, the link. The sentence shown is a real Unug output line from
// the game deck (machine text, shown verbatim). Somali UI lines are drafts
// — !! VERIFY SOMALI !! — khalid reviews before posting.
//
// Run: npx tsx scripts/poster-unug-game.tsx
// Out: ../dhiblabs/assets/promo/fb-unug-game.png (1080x1350)

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
        CIYAAR CUSUB
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 20,
          fontSize: 92,
          fontWeight: 700,
          color: TEXT,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          lineHeight: 1.05,
        }}
        lang="so"
      >
        Unug mise Qof?
      </div>

      <div style={{ display: 'flex', flexGrow: 0.7 }} />

      {/* One round of the game: sentence card + two choices */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 860,
          border: `1.5px solid ${FAINT}`,
          borderRadius: 20,
          padding: '44px 48px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, color: MUTED, marginBottom: 18 }}>
          Yaa qoray jumladan?
        </div>
        <div
          style={{ display: 'flex', fontSize: 34, lineHeight: 1.5, color: TEXT }}
          lang="so"
        >
          &ldquo;Dadka kale waxaa ka fogaadhaa gabayga Afrika.&rdquo;
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 36 }}>
          <div
            style={{
              display: 'flex', flex: 1, justifyContent: 'center',
              padding: '18px 0', borderRadius: 12, border: `2px solid ${ACCENT}`,
              color: ACCENT, fontSize: 28, fontWeight: 700,
            }}
          >
            Unug (AI)
          </div>
          <div
            style={{
              display: 'flex', flex: 1, justifyContent: 'center',
              padding: '18px 0', borderRadius: 12, border: `2px solid ${TEXT}`,
              color: TEXT, fontSize: 28, fontWeight: 700,
            }}
          >
            Qof
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      {/* Link + lockup */}
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: ACCENT }}>
        qor.unkad.com/unug
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 26,
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
  const file = path.join(OUT_DIR, 'fb-unug-game.png');
  fs.writeFileSync(file, buf);
  console.log(`${file}  1080x1350  ${(buf.length / 1024).toFixed(1)}kB`);
}

main();
