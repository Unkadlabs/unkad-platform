// Announcement poster for the joint online event with Somast (formerly Goobo
// Labs), Somali and English. Two halves of one evening: Somast on what AI can do
// in Somali, Unkad Labs on where it goes wrong. Their press-kit logo still shows
// the old Goobo wordmark, so the name is set as text for now; their Deep Teal #117B72 sits beside
// our #0F6B5C on white. Date and Meet link confirmed by the founder 10 Oct 2026.
// Somali: !! VERIFY SOMALI !!  Needs Somast's sign-off before posting.
//
// Run: npx tsx scripts/poster-somast-event.tsx
// Out: ../dhiblabs/assets/promo/fb-somast-event-so.png, -en.png (1080x1350)

import React from 'react';
import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, '..', 'dhiblabs');
const FONTS_DIR = path.join(SITE, 'assets', 'fonts');
const OUT_DIR = path.join(SITE, 'assets', 'promo');

const BG = '#FFFFFF', TEXT = '#171715', MUTED = '#8A867E', RULE = '#E4E2DD', TODO = '#C0392B';
const UNKAD = '#0F6B5C', SOMAST = '#117B72';
const fonts = [
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Literata', data: fs.readFileSync(path.join(FONTS_DIR, 'Literata-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

// Placeholders until the new date and the sign-up link are confirmed.
const DATE = { so: 'Arbaco, 14 Oktoobar', en: 'Wednesday 14 October' };
const LINK = 'qor.unkad.com/kulan';
// QR to the registration page (not the Meet link) so people get the
// confirmation email and reminders. Built from assets/promo/qr-kulan.svg.
const QR = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(SITE, 'assets', 'promo', 'qr-kulan.svg')).toString('base64');

const COPY = [
  {
    lang: 'so' as const,
    eyebrow: 'Kulan online ah',
    title: 'AI-ga iyo Af-Soomaaliga',
    sub: 'Waxa uu qaban karo, iyo halka uu ka khaldamo',
    left: 'Waxa AI-gu u qaban karo Af-Soomaaliga maanta, oo si toos ah loo tusayo',
    right: 'Jawaabaha fasiixa ah ee khaldan, sababta, iyo sida loo hubiyo',
    date: DATE.so,
    time: '8:00 ilaa 9:00 fiidnimo (EAT)',
    where: 'Google Meet',
    join: 'Isdiiwaangeli: ' + LINK,
    scan: 'Iska diiwaangeli',
  },
  {
    lang: 'en' as const,
    eyebrow: 'Online event',
    title: 'AI in Somali',
    sub: 'What it can do, and where it goes wrong',
    left: 'What AI can do for Somali today, with live demos',
    right: 'Fluent Somali answers that are wrong, why, and how to check',
    date: DATE.en,
    time: '20:00 to 21:00 EAT',
    where: 'Google Meet',
    join: 'Register: ' + LINK,
    scan: 'Scan to register',
  },
];

const CELLS = [[38, 70, true], [6, 70], [70, 70], [6, 38], [70, 38], [6, 6], [70, 6]] as const;

function UnkadLockup() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={46} height={46} viewBox="0 0 100 100">
        {CELLS.map(([x, y, seed]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={24} height={24} fill={seed ? UNKAD : TEXT} />
        ))}
      </svg>
      <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>Unkad Labs</div>
    </div>
  );
}

const ph = (s: string) => (s.startsWith('[') || s.includes('[') ? TODO : TEXT);

function Poster({ c }: { c: (typeof COPY)[number] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: BG, padding: '84px 84px 76px', fontFamily: 'Literata' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Their press-kit "somast" SVG still draws the old Goobo wordmark (10 Oct 2026),
            so the name is set as text in their Deep Teal until they send the new logo. */}
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: SOMAST, letterSpacing: '-0.01em' }}>Somast</div>
        <div style={{ display: 'flex', fontSize: 30, color: MUTED }}>×</div>
        <UnkadLockup />
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', fontSize: 26, color: MUTED }} lang={c.lang}>{c.eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 88, fontWeight: 700, color: TEXT, lineHeight: 1.05, letterSpacing: '-0.02em' }} lang={c.lang}>
        {c.title.replace(/-/g, '‑')}
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 34, color: TEXT, lineHeight: 1.3 }} lang={c.lang}>{c.sub}</div>

      <div style={{ display: 'flex', marginTop: 56, borderTop: `2px solid ${RULE}` }}>
        {[['Somast', SOMAST, c.left], ['Unkad Labs', UNKAD, c.right]].map(([who, col, what], i) => (
          <div key={who} style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: 26, paddingLeft: i ? 34 : 0, paddingRight: i ? 0 : 34, borderLeft: i ? `2px solid ${RULE}` : 'none' }}>
            <div style={{ display: 'flex', width: 46, height: 6, backgroundColor: col }} />
            <div style={{ display: 'flex', marginTop: 16, fontSize: 30, fontWeight: 700, color: col }}>{who}</div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 25, color: MUTED, lineHeight: 1.4 }} lang={c.lang}>{what.replace(/-/g, '\u2011')}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: `2px solid ${TEXT}`, paddingTop: 24 }} lang={c.lang}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: TEXT }}>{c.date}</div>
          <div style={{ display: 'flex', fontSize: 30, color: TEXT }}>{c.time} · {c.where}</div>
          <div style={{ display: 'flex', marginTop: 6, fontSize: 28, fontWeight: 700, color: UNKAD }}>{c.join}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <img src={QR} width={150} height={150} />
          <div style={{ display: 'flex', fontSize: 18, color: MUTED }}>{c.scan}</div>
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
    const file = path.join(OUT_DIR, `fb-somast-event-${c.lang}.png`);
    fs.writeFileSync(file, buf);
    console.log(`${file}  ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

main();
