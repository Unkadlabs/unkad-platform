// Social share card for qor.unkad.com, generated at build time.
//
// Without this, sharing the platform on Facebook or WhatsApp renders a bare
// link with no image, which is the difference between a post people stop on and
// one they scroll past. Copy is Somali because the people being invited are
// Somali speakers, and every string here is already live on the site.

import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const alt = 'Qor Af-Soomaali';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG = '#141312';
const TEXT = '#E8E6E1';
const MUTED = '#A5A19A';
const ACCENT = '#4DB6A5';

function fonts() {
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  return [
    {
      name: 'Source Serif 4',
      data: fs.readFileSync(path.join(dir, 'SourceSerif4-Regular.otf')),
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Source Serif 4',
      data: fs.readFileSync(path.join(dir, 'SourceSerif4-Bold.otf')),
      weight: 700 as const,
      style: 'normal' as const,
    },
  ];
}

// The cell-U mark: seven cells assembling from one accent-coloured seed.
function Mark({ size: s }: { size: number }) {
  const u = s / 100;
  const cell = (x: number, y: number, fill: string) => (
    <div
      key={`${x}-${y}`}
      style={{
        position: 'absolute',
        left: x * u,
        top: y * u,
        width: 24 * u,
        height: 24 * u,
        borderRadius: 6 * u,
        backgroundColor: fill,
      }}
    />
  );
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex' }}>
      {cell(38, 70, ACCENT)}
      {cell(6, 70, TEXT)}
      {cell(70, 70, TEXT)}
      {cell(6, 38, TEXT)}
      {cell(70, 38, TEXT)}
      {cell(6, 6, TEXT)}
      {cell(70, 6, TEXT)}
    </div>
  );
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 76,
          backgroundColor: BG,
          backgroundImage:
            'radial-gradient(900px 620px at 8% 112%, rgba(77,182,165,0.18), rgba(20,19,18,0) 62%)',
          fontFamily: 'Source Serif 4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Mark size={46} />
          <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>Unkad Labs</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 92,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Qor Af-Soomaali
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 38,
              color: ACCENT,
              marginTop: 26,
            }}
          >
            Aynu af-Soomaaliga u qorno da&rsquo;da AI-ga.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              height: 3,
              width: 88,
              backgroundColor: ACCENT,
              marginBottom: 20,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 26,
            }}
          >
            <div style={{ display: 'flex', color: MUTED }}>Ereyada waa hanti.</div>
            <div style={{ display: 'flex', color: TEXT }}>qor.unkad.com</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts() }
  );
}
