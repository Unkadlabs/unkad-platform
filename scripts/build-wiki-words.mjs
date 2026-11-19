// Build the reference list of common Somali words for /ereyada?v=maqan.
//
// Source: Somali Wikipedia, as cleaned in the SomaliWeb_v2 pipeline. This is
// the WEB layer and is used here only as a frequency reference: which words
// are common in written Somali. No Wikipedia text enters the Qor corpus, and
// the page labels the list as Wikipedia's (standing rule 4). Word counts are
// facts about the text, so a frequency list carries no sentences forward.
//
//   node scripts/build-wiki-words.mjs ../../SomaliWeb_v2/data/raw/sowiki_clean.txt
//
// Writes lib/data/wiki-words.json: [[word, count], ...], most common first.

import fs from 'fs';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-wiki-words.mjs <sowiki_clean.txt>');
  process.exit(1);
}
const TOP = 10000;

// Wikipedia boilerplate and markup that survive cleaning.
const STOP = new Set(
  ('category tixraac tixraacyada file jpg png svg style align text center left right ' +
    'com www http https org html de by tv df mf ft sh the of and in to for on with at from ' +
    'is was as or an be are it this that by de la le el da van von des du der und ' +
    'thumb px ref cite web url title isbn pdf cm mi km kg ff uk st th nd rd age asia khaki ' +
    // Name parts the capitalisation test misses (often written lower-case in
    // compounds such as "bint", "ibni").
    'abd bint ibni binu cismaan yoonis abokor cabdulaahi muxamad siciid').split(' ')
);
// Month names are written capitalised, which would make the proper-noun filter
// below drop them, but they are ordinary words every speaker uses.
const KEEP = new Set(
  'janaayo febraayo maarso abriil maajo juun luulyo agoosto sebtembar oktoobar nofembar noofambar diseembar'.split(' ')
);

const text = fs.readFileSync(src, 'utf8').normalize('NFC').replace(/[‘’ʼ`]/g, "'");
const lower = new Map();
const capital = new Map();
for (const m of text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)*/g)) {
  const raw = m[0];
  const w = raw.toLowerCase();
  lower.set(w, (lower.get(w) ?? 0) + 1);
  if (raw[0] !== raw[0].toLowerCase()) capital.set(w, (capital.get(w) ?? 0) + 1);
}

const out = [];
for (const [w, n] of [...lower.entries()].sort((a, b) => b[1] - a[1])) {
  if (out.length >= TOP) break;
  if (w.length < 3 || STOP.has(w)) continue;
  // Somali's Latin alphabet has no p, v or z: a word with one is a loanword
  // spelled foreign-style, a name, or English.
  if (/[pvz]/.test(w)) continue;
  // Written capitalised most of the time: a name or place, not vocabulary.
  if (!KEEP.has(w) && (capital.get(w) ?? 0) / n > 0.5) continue;
  out.push([w, n]);
}

fs.mkdirSync('lib/data', { recursive: true });
fs.writeFileSync('lib/data/wiki-words.json', JSON.stringify(out));
console.log(`wrote lib/data/wiki-words.json: ${out.length} words`);
