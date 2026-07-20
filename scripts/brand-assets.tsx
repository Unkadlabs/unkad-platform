// Brand asset generator — profile logos and banners for every social
// platform, all from the one mark + Source Serif system. Platforms
// reject SVG uploads, so everything renders to PNG at each platform's
// preferred size. Output: ../dhiblabs/assets/brand/
//
// Run: npx tsx scripts/brand-assets.tsx

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const FONTS_DIR = '/Users/khalidyusufdahir/research/dhiblabs/assets/fonts';
const OUT_DIR = '/Users/khalidyusufdahir/research/dhiblabs/assets/brand';

const LIGHT = { bg: '#FCFBF8', text: '#1A1917', muted: '#6B6862', accent: '#0F6B5C' };
const DARK = { bg: '#141312', text: '#E8E6E1', muted: '#A5A19A', accent: '#4DB6A5' };

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

function Mark({ size, text, accent }: { size: number; text: string; accent: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="38" y="70" width="24" height="24" rx="6" fill={accent} />
      <rect x="6" y="70" width="24" height="24" rx="6" fill={text} />
      <rect x="70" y="70" width="24" height="24" rx="6" fill={text} />
      <rect x="6" y="38" width="24" height="24" rx="6" fill={text} />
      <rect x="70" y="38" width="24" height="24" rx="6" fill={text} />
      <rect x="6" y="6" width="24" height="24" rx="6" fill={text} />
      <rect x="70" y="6" width="24" height="24" rx="6" fill={text} />
    </svg>
  );
}

async function render(element: React.ReactElement, width: number, height: number, file: string) {
  const resp = new ImageResponse(element, { width, height, fonts });
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, file), buf);
  console.log(`${file}  ${width}x${height}  ${(buf.length / 1024).toFixed(1)}kB`);
}

// Square avatar: mark centered at ~63% of canvas.
function Avatar({ size, theme }: { size: number; theme: typeof LIGHT }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.bg,
      }}
    >
      <Mark size={Math.round(size * 0.63)} text={theme.text} accent={theme.accent} />
    </div>
  );
}

// Wide banner: mark + wordmark + gloss left, urls right. Always dark.
function Banner({
  markSize,
  nameSize,
  glossSize,
  urlSize,
  pad,
}: {
  markSize: number;
  nameSize: number;
  glossSize: number;
  urlSize: number;
  pad: number;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: DARK.bg,
        padding: `0 ${pad}px`,
        gap: Math.round(markSize * 0.34),
        fontFamily: 'Source Serif 4',
      }}
    >
      <Mark size={markSize} text={DARK.text} accent={DARK.accent} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: nameSize,
            fontWeight: 700,
            color: DARK.text,
            letterSpacing: '-0.01em',
          }}
        >
          Unkad Labs
        </div>
        <div style={{ fontSize: glossSize, color: DARK.muted, marginTop: 6 }}>
          Unkad — Somali for creation from nothing.
        </div>
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          fontSize: urlSize,
        }}
      >
        <div style={{ display: 'flex', color: DARK.accent }}>unkad.com</div>
        <div style={{ display: 'flex', color: DARK.muted }}>qor.unkad.com</div>
      </div>
    </div>
  );
}

async function main() {
  // ---- Square avatars (light = primary, dark = alternate) ----
  await render(<Avatar size={400} theme={LIGHT} />, 400, 400, 'x-avatar-400.png');
  await render(<Avatar size={400} theme={DARK} />, 400, 400, 'x-avatar-400-dark.png');
  await render(<Avatar size={300} theme={LIGHT} />, 300, 300, 'linkedin-logo-300.png');
  await render(<Avatar size={500} theme={LIGHT} />, 500, 500, 'github-avatar-500.png');
  await render(<Avatar size={512} theme={LIGHT} />, 512, 512, 'huggingface-avatar-512.png');
  await render(<Avatar size={1024} theme={LIGHT} />, 1024, 1024, 'logo-master-1024.png');
  await render(<Avatar size={1024} theme={DARK} />, 1024, 1024, 'logo-master-1024-dark.png');

  // ---- Banners ----
  await render(
    <Banner markSize={84} nameSize={52} glossSize={22} urlSize={20} pad={64} />,
    1128,
    191,
    'linkedin-banner-1128x191.png'
  );
  await render(
    <Banner markSize={170} nameSize={104} glossSize={42} urlSize={34} pad={120} />,
    1500,
    500,
    'x-banner-1500x500.png'
  );

  console.log(`\nAssets written to ${OUT_DIR}`);
}

main();
