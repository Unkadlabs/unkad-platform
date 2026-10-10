// Public events: registration, calendar files, confirmation and reminder mail.
//
// Data-driven on purpose. An event is one entry in EVENTS; the /kulan pages,
// the .ics route, the confirmation email and scripts/event-reminders.mjs all
// read from here, so a second event is a config entry and nothing else.
//
// This file must stay importable outside Next.js: the reminder script loads it
// through tsx. So no next/* imports, no db, no path aliases. Pure functions of
// the config plus node's crypto.
//
// !! VERIFY SOMALI !!
// Every Somali string in this file (event copy, date words, email text) is a
// draft pending founder review.

import { createHmac, timingSafeEqual } from 'crypto';

export type Lang = 'so' | 'en';
export type Bi = { so: string; en: string };

export type EventHost = { name: string; blurb: Bi };

export type EventConfig = {
  slug: string;
  title: Bi;
  subtitle: Bi;
  hosts: EventHost[];
  // ISO instants in UTC. The local display time is derived from timeZone.
  start: string;
  end: string;
  timeZone: string;
  tzLabel: string;
  meetUrl: string;
};

export const EVENTS: EventConfig[] = [
  {
    slug: 'ai-somali-2026-10-14',
    title: { so: 'AI-ga iyo Af-Soomaaliga', en: 'AI in Somali' }, // !! VERIFY SOMALI !!
    subtitle: {
      so: 'Waxa uu qaban karo, iyo halka uu ka khaldamo', // founder-verified 10 Oct 2026
      en: 'What it can do, and where it goes wrong',
    },
    hosts: [
      {
        name: 'Somast',
        blurb: {
          so: 'Waxa AI-gu maanta u qaban karo Af-Soomaaliga, oo leh tusaalooyin toos ah.', // !! VERIFY SOMALI !!
          en: 'What AI can do for Somali today, with live demos.',
        },
      },
      {
        name: 'Unkad Labs',
        blurb: {
          so: 'Jawaabo Af-Soomaali ah oo si fiican u qoran balse khaldan: sababta, iyo sida loo hubiyo.', // !! VERIFY SOMALI !!
          en: 'Fluent Somali answers that are wrong, why, and how to check.',
        },
      },
    ],
    start: '2026-10-14T17:00:00Z', // 20:00 EAT
    end: '2026-10-14T18:00:00Z', // 21:00 EAT
    timeZone: 'Africa/Nairobi',
    tzLabel: 'EAT',
    meetUrl: 'https://meet.google.com/cuh-bmox-gwr',
  },
];

export const SITE_BASE = 'https://qor.unkad.com';

export function getEvent(slug: string | null | undefined): EventConfig | undefined {
  return EVENTS.find((e) => e.slug === slug);
}

// The event /kulan shows: the next one that has not ended, else the most
// recent one (so the page says "ended" rather than 404ing).
export function currentEvent(now: Date = new Date()): EventConfig {
  const sorted = [...EVENTS].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.find((e) => new Date(e.end) > now) ?? sorted[sorted.length - 1];
}

export function registrationOpen(ev: EventConfig, now: Date = new Date()): boolean {
  return now < new Date(ev.end);
}

// ---- Dates ------------------------------------------------------------------

// !! VERIFY SOMALI !! day and month names.
const DAYS: Record<Lang, string[]> = {
  so: ['Axad', 'Isniin', 'Talaado', 'Arbaco', 'Khamiis', 'Jimco', 'Sabti'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTHS: Record<Lang, string[]> = {
  so: [
    'Janaayo', 'Febraayo', 'Maarso', 'Abriil', 'Maajo', 'Juun',
    'Luuliyo', 'Ogost', 'Sebtembar', 'Oktoobar', 'Nofembar', 'Desembar',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

// Numeric parts only from Intl, so the words come from the tables above and
// never depend on the runtime's ICU data for Somali.
function localParts(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    year: get('year'),
    month: Number(get('month')) - 1,
    day: Number(get('day')),
    weekday: wd,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function utcTime(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

// "Arbaco, 14 Oktoobar 2026, 20:00 ilaa 21:00 EAT (17:00 ilaa 18:00 UTC)"
export function whenLabel(ev: EventConfig, lang: Lang): string {
  const s = localParts(ev.start, ev.timeZone);
  const e = localParts(ev.end, ev.timeZone);
  const to = lang === 'so' ? 'ilaa' : 'to'; // !! VERIFY SOMALI !!
  const date = `${DAYS[lang][s.weekday]}, ${s.day} ${MONTHS[lang][s.month]} ${s.year}`;
  return (
    `${date}, ${s.time} ${to} ${e.time} ${ev.tzLabel} ` +
    `(${utcTime(ev.start)} ${to} ${utcTime(ev.end)} UTC)`
  );
}

// 20261014T170000Z
function icsStamp(d: Date | string): string {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// ---- Calendar ---------------------------------------------------------------

function calendarDetails(ev: EventConfig, lang: Lang): string {
  const hosts = ev.hosts.map((h) => `${h.name}: ${h.blurb[lang]}`).join('\n');
  return `${ev.subtitle[lang]}\n\n${hosts}\n\nGoogle Meet: ${ev.meetUrl}`;
}

export function calendarTitle(ev: EventConfig, lang: Lang): string {
  return `${ev.title[lang]} (${ev.hosts.map((h) => h.name).join(' x ')})`;
}

export function googleCalendarUrl(ev: EventConfig, lang: Lang): string {
  const enc = encodeURIComponent;
  // `dates` keeps its literal slash, the form Google documents.
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${enc(calendarTitle(ev, lang))}` +
    `&dates=${icsStamp(ev.start)}/${icsStamp(ev.end)}` +
    `&details=${enc(calendarDetails(ev, lang))}` +
    `&location=${enc(ev.meetUrl)}`
  );
}

// RFC 5545 TEXT escaping.
function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 octets are folded with CRLF + space, never splitting a
// UTF-8 character.
function icsFold(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, 'utf8');
    const limit = out.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (bytes + n > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(ev: EventConfig, lang: Lang, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Unkad Labs//Qor Af-Soomaali//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.slug}@qor.unkad.com`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(ev.start)}`,
    `DTEND:${icsStamp(ev.end)}`,
    `SUMMARY:${icsText(calendarTitle(ev, lang))}`,
    `DESCRIPTION:${icsText(calendarDetails(ev, lang))}`,
    `LOCATION:${icsText(ev.meetUrl)}`,
    `URL:${ev.meetUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(ev.title[lang])}`,
    'TRIGGER:-PT60M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

export function icsFilename(ev: EventConfig): string {
  return `${ev.slug}.ics`;
}

// ---- Unsubscribe tokens -----------------------------------------------------
//
// The token is "<registration id>.<HMAC-SHA256(secret, id)>", so it can be
// verified without storing anything. The secret is EVENT_TOKEN_SECRET; the
// caller passes it in so this stays free of process.env reads (the reminder
// script loads its env from .env.local into its own object).

function sig(id: string, secret: string): string {
  return createHmac('sha256', secret).update(`event-unsub:${id}`).digest('base64url');
}

export function signEventToken(id: string, secret: string): string {
  return `${id}.${sig(id, secret)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns the registration id, or null if the token is malformed or forged.
export function verifyEventToken(token: string, secret: string): string | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  if (!UUID_RE.test(id)) return null;
  const want = Buffer.from(sig(id, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return id;
}

export function unsubscribeUrl(base: string, id: string, secret: string): string {
  return `${base}/kulan/ka-bax?t=${encodeURIComponent(signEventToken(id, secret))}`;
}

// ---- Email copy -------------------------------------------------------------
// !! VERIFY SOMALI !! all Somali text below.

function hostLines(ev: EventConfig, lang: Lang): string {
  return ev.hosts.map((h) => `- ${h.name}: ${h.blurb[lang]}`).join('\n');
}

export function confirmationEmail(
  ev: EventConfig,
  lang: Lang,
  opts: { name: string; unsubUrl: string }
): { subject: string; text: string } {
  const when = whenLabel(ev, lang);
  const gcal = googleCalendarUrl(ev, lang);
  if (lang === 'so') {
    return {
      subject: `Waad is diiwaangelisay: ${ev.title.so}`,
      text:
        `${opts.name}, mahadsanid.\n\n` +
        `${ev.title.so}\n${ev.subtitle.so}\n\n` +
        `Goorma: ${when}\n` +
        `Xiriirka kulanka (Google Meet): ${ev.meetUrl}\n\n` +
        `Ku dar Google Calendar: ${gcal}\n` +
        `Faylka kalandarka (.ics) waa ku lifaaqan iimaylkan.\n\n` +
        `${hostLines(ev, 'so')}\n\n` +
        `Waxaan kuu soo diri doonnaa laba xusuusin: maalin ka hor iyo saacad ka hor.\n\n` +
        `Unkad Labs\n\n` +
        `Iimaylada kulankan ka bax: ${opts.unsubUrl}\n`,
    };
  }
  return {
    subject: `You are registered: ${ev.title.en}`,
    text:
      `${opts.name}, thank you.\n\n` +
      `${ev.title.en}\n${ev.subtitle.en}\n\n` +
      `When: ${when}\n` +
      `Meeting link (Google Meet): ${ev.meetUrl}\n\n` +
      `Add to Google Calendar: ${gcal}\n` +
      `The calendar file (.ics) is attached to this email.\n\n` +
      `${hostLines(ev, 'en')}\n\n` +
      `We will send two reminders: a day before and an hour before.\n\n` +
      `Unkad Labs\n\n` +
      `Stop emails about this event: ${opts.unsubUrl}\n`,
  };
}

export type ReminderKind = 'day' | 'hour';

export function reminderEmail(
  ev: EventConfig,
  lang: Lang,
  kind: ReminderKind,
  opts: { name: string; unsubUrl: string }
): { subject: string; text: string } {
  const when = whenLabel(ev, lang);
  if (lang === 'so') {
    const lead = kind === 'day' ? 'Xusuusin' : 'Wuxuu dhowaan bilaabanayaa';
    return {
      subject: `${lead}: ${ev.title.so}`,
      text:
        `${opts.name},\n\n` +
        `${ev.title.so}\n${when}\n\n` +
        `Ku soo biir halkan: ${ev.meetUrl}\n\n` +
        `Unkad Labs\n\n` +
        `Iimaylada kulankan ka bax: ${opts.unsubUrl}\n`,
    };
  }
  const lead = kind === 'day' ? 'Reminder' : 'Starting soon';
  return {
    subject: `${lead}: ${ev.title.en}`,
    text:
      `${opts.name},\n\n` +
      `${ev.title.en}\n${when}\n\n` +
      `Join here: ${ev.meetUrl}\n\n` +
      `Unkad Labs\n\n` +
      `Stop emails about this event: ${opts.unsubUrl}\n`,
  };
}
