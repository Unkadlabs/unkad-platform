// Facebook posters on peer validation (Aug 2026). Ultra-minimal.
//
//   fb-qiimeyn-cod.png     1080x1350  one vote / two votes
//   fb-qiimeyn-eber.png    1080x1080  the 0%
//
// No cards, no bars, no step lists. Each poster carries exactly one idea at
// a size you cannot scroll past, and everything else is set small enough to
// stay out of its way. The earlier version explained the rule in four boxes,
// which is a diagram, not a poster.
//
// !! SOMALI NOT YET REVIEWED !! Drafted by Claude, except the benchmark
// numbers, which are founder-verified from poster-qiimeyn.tsx (2026-08-12).
//
// Run: npx tsx scripts/poster-qiimeyn-asxaab.tsx
// Out: ../dhiblabs/assets/promo/

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, '..', 'dhiblabs', 'assets', 'promo');

const LIGHT = { bg: '#FCFBF8', text: '#1A1917', muted: '#6B6862', accent: '#0F6B5C' };
const DARK = { bg: '#141312', text: '#E8E6E1', muted: '#A5A19A', accent: '#4DB6A5' };
type P = typeof LIGHT;

const fonts = [
  { name: 'Source Serif 4', data: fs.readFileSync(path.join(FONTS_DIR, 'SourceSerif4-Regular.otf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Source Serif 4', data: fs.readFileSync(path.join(FONTS_DIR, 'SourceSerif4-Bold.otf')), weight: 700 as const, style: 'normal' as const },
];

// The wordmark sits small and stays small. On a poster carrying one idea,
// branding that competes with the idea is just noise.
const Wordmark = ({ p }: { p: P }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <svg width={26} height={26} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={p.accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={p.text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={p.text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={p.text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={p.text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={p.text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={p.text} />
    </svg>
    <div style={{ display: 'flex', fontSize: 21, color: p.muted, letterSpacing: '0.14em' }}>
      UNKAD LABS
    </div>
  </div>
);

const Shell = ({ p, children }: { p: P; children: React.ReactNode }) => (
  <div style={{
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    backgroundColor: p.bg, padding: '76px 88px', fontFamily: 'Source Serif 4',
  }}>{children}</div>
);

// ---------------------------------------------------------------------------
// One vote is an opinion. Two is evidence. That is the whole rule, and it
// needs no diagram: the type does the work by making one word small and the
// other enormous.

function VotePoster() {
  const p = LIGHT;
  return (
    <Shell p={p}>
      <Wordmark p={p} />
      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 40, color: p.muted }}>Hal cod</div>
      <div style={{ display: 'flex', fontSize: 96, color: p.muted, lineHeight: 1.1, marginTop: 4 }}>
        waa ra&rsquo;yi.
      </div>

      <div style={{ display: 'flex', fontSize: 40, color: p.accent, marginTop: 92 }}>Laba cod</div>
      <div style={{ display: 'flex', fontSize: 178, fontWeight: 700, color: p.text, lineHeight: 1.02, marginTop: 2 }}>
        waa xog.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', fontSize: 30, color: p.muted, lineHeight: 1.5 }}>
        Jumlad kasta oo Qor lagu qoro, laba qof oo kale ayaa akhriya.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 26 }}>
        <div style={{ display: 'flex', fontSize: 27, color: p.accent }}>qor.unkad.com</div>
        <div style={{ display: 'flex', fontSize: 24, color: p.muted }}>284 ayaa sugaya</div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// The 0% carries itself. Anything drawn around it makes it smaller.

function ZeroPoster() {
  const p = DARK;
  return (
    <Shell p={p}>
      <Wordmark p={p} />
      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 340, fontWeight: 700, color: p.text, lineHeight: 0.9 }}>
        0%
      </div>
      <div style={{ display: 'flex', fontSize: 42, color: p.muted, lineHeight: 1.4, marginTop: 34 }}>
        wixii GPT-5.6 iyo Gemini 3.1 Pro ka qabteen qoraalada Soomaaliga ah ee khaldan.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', fontSize: 46, color: p.accent }}>Asxaabta Qor: 100%.</div>
      <div style={{ display: 'flex', fontSize: 27, color: p.muted, marginTop: 30 }}>qor.unkad.com</div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// A real sentence from the corpus, shown as it stands after two people read
// it. Concrete beats abstract: this is not an illustration of validation, it
// is a thing that actually happened.
//
// Chosen from released, twice-approved submissions. Released matters, because
// it is already public; the contributor's name is deliberately absent even
// though their credit choice is real_name, since agreeing to a dataset credit
// is not the same as agreeing to appear on a poster. Ask them first if you
// want the name on it.

const SNAPSHOT = {
  // Founder-corrected 2026-08-18. The corpus row reads "saameyn" and
  // "bulshadeyna"; khalid's spelling is "saamayn" and "bulshadeena". The
  // poster carries his, and the database row needs the same fix, which is
  // logged as an erratum rather than done quietly, because this sentence has
  // already shipped in a public release.
  text: 'Garaad gacmeedku saamayn weyn ayuu ku yeeshey bulshadeena',
  sector: 'tignoolajiyad',
};

const Ticks = ({ c }: { c: string }) => (
  <svg width={116} height={46} viewBox="0 0 116 46">
    <path d="M6 25l11 11L39 12" stroke={c} strokeWidth="5" fill="none"
      strokeLinecap="round" strokeLinejoin="round" />
    <path d="M66 25l11 11L99 12" stroke={c} strokeWidth="5" fill="none"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SnapshotPoster() {
  const p = LIGHT;
  return (
    <Shell p={p}>
      <Wordmark p={p} />
      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 68, color: p.text, lineHeight: 1.28 }}>
        &ldquo;{SNAPSHOT.text}&rdquo;
      </div>

      <div style={{ display: 'flex', marginTop: 64 }}>
        <Ticks c={p.accent} />
      </div>
      <div style={{ display: 'flex', fontSize: 38, color: p.muted, marginTop: 22 }}>
        Laba qof ayaa akhriyay.
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 27, color: p.accent }}>qor.unkad.com</div>
        <div style={{ display: 'flex', fontSize: 24, color: p.muted }}>284 ayaa sugaya</div>
      </div>
    </Shell>
  );
}

async function render(node: React.ReactElement, w: number, h: number, file: string) {
  const img = new ImageResponse(node, { width: w, height: h, fonts });
  const buf = Buffer.from(await img.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, file), buf);
  console.log(`  ${file}  ${w}x${h}  ${(buf.length / 1024).toFixed(0)}KB`);
}

(async () => {
  await render(<SnapshotPoster />, 1080, 1350, 'fb-qiimeyn-jumlad.png');
  await render(<VotePoster />, 1080, 1350, 'fb-qiimeyn-cod.png');
  await render(<ZeroPoster />, 1080, 1080, 'fb-qiimeyn-eber.png');
})();
