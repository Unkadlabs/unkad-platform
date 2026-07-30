// Score the sentence splitter against human annotation.
//
// Turns "the splitter is roughly fine" into a number that can be published,
// argued with, and improved against. Without this, every sentence count on the
// platform and every row in the dataset rests on an unmeasured guess.
//
//   node scripts/sentence-eval.mjs data/sentence-gold/annotated.txt
//
// Metric: boundary precision, recall and F1, which is what the sentence
// segmentation literature reports, so the number is comparable to what is
// published for other languages.
//
//   precision — of the boundaries the splitter proposed, how many were real
//   recall    — of the real boundaries, how many the splitter found
//
// Both matter and they fail differently. Low recall welds two sentences into
// one row, which teaches a model that a run-on is normal. Low precision cuts a
// sentence in half, which puts a fragment in a benchmark and marks a model wrong
// for completing it correctly. Precision errors are the more expensive kind,
// which is why they are listed individually below rather than only counted.

import fs from 'fs';
import { splitSentences } from '../lib/sentences.ts';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/sentence-eval.mjs <annotated.txt>');
  console.error('produce the unannotated file with scripts/sentence-gold-prepare.mjs');
  process.exit(1);
}

// Parse the annotation format: ITEM <id> ... END, with ||| marking boundaries.
const items = [];
let current = null;
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (line.startsWith('#')) continue;
  if (line.startsWith('ITEM ')) {
    current = { id: line.slice(5).split(' ')[0], lines: [], uncertain: line.includes('?') };
    continue;
  }
  if (line.startsWith('END')) {
    if (current) items.push(current);
    current = null;
    continue;
  }
  if (current) current.lines.push(line);
}

if (items.length === 0) {
  console.error('no ITEM blocks found; is this the annotated file?');
  process.exit(1);
}

// Offsets are measured on whitespace-normalised text, not on the raw string.
//
// Two reasons, both learned by getting it wrong. Removing a `|||` that sat
// between two sentences with no surrounding space produced `guusha.Waxa`, and
// the splitter needs whitespace after a period, so it proposed no boundaries at
// all and the scorer reported 0% for a splitter that was working. And the
// splitter rejoins soft-wrapped lines, turning a newline into a space, so its
// output no longer appears verbatim in the source and a plain indexOf fails.
// Normalising both sides removes both problems and costs nothing: a boundary is
// a position between words, and how much whitespace surrounds it is irrelevant.
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function offsetsFromMarkers(text) {
  const offsets = [];
  let clean = '';
  let i = 0;
  while (i < text.length) {
    const m = /^\s*\|\|\|\s*/.exec(text.slice(i));
    if (m) {
      clean = clean.replace(/\s+$/, '');
      offsets.push(norm(clean).length);
      clean += ' ';
      i += m[0].length;
      continue;
    }
    clean += text[i];
    i += 1;
  }
  // `raw` keeps its line breaks: the splitter's soft-wrap logic depends on them,
  // so stripping them here would hide the very behaviour being tested.
  return { raw: clean, normalized: norm(clean), offsets };
}

function offsetsFromSplitter(raw, normalized) {
  const parts = splitSentences(raw);
  const offsets = [];
  let cursor = 0;
  for (const part of parts.slice(0, -1)) {
    const at = normalized.indexOf(norm(part), cursor);
    if (at === -1) continue;
    cursor = at + norm(part).length;
    offsets.push(cursor);
  }
  return offsets;
}

// A boundary within this many characters of a gold boundary counts as found.
// Whitespace and trailing punctuation make exact equality meaningless.
const TOLERANCE = 3;
const near = (x, list) => list.some((y) => Math.abs(x - y) <= TOLERANCE);

let tp = 0, fp = 0, fn = 0;
const falseCuts = [], missed = [];

for (const item of items) {
  const raw = item.lines.join('\n').trim();
  if (!raw) continue;
  const { raw: text, normalized, offsets: gold } = offsetsFromMarkers(raw);
  const pred = offsetsFromSplitter(text, normalized);

  for (const p of pred) {
    if (near(p, gold)) tp += 1;
    else { fp += 1; if (falseCuts.length < 12) falseCuts.push(context(normalized, p)); }
  }
  for (const g of gold) {
    if (!near(g, pred)) { fn += 1; if (missed.length < 12) missed.push(context(normalized, g)); }
  }
}

function context(s, at) {
  return `…${s.slice(Math.max(0, at - 38), at)} ⟨HERE⟩ ${s.slice(at, at + 38)}…`.replace(/\s+/g, ' ');
}

const precision = tp + fp ? tp / (tp + fp) : 0;
const recall = tp + fn ? tp / (tp + fn) : 0;
const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
const pct = (x) => `${(x * 100).toFixed(1)}%`;

console.log(`\n  passages annotated: ${items.length}`);
console.log(`  gold boundaries:    ${tp + fn}`);
console.log(`  proposed:           ${tp + fp}\n`);
console.log(`  precision  ${pct(precision)}   (of cuts made, how many were real)`);
console.log(`  recall     ${pct(recall)}   (of real boundaries, how many were found)`);
console.log(`  F1         ${pct(f1)}\n`);

if (falseCuts.length) {
  console.log(`  cuts made where there is no boundary (${fp} total, worst kind):`);
  falseCuts.forEach((c) => console.log(`    ${c}`));
  console.log('');
}
if (missed.length) {
  console.log(`  boundaries missed (${fn} total):`);
  missed.forEach((c) => console.log(`    ${c}`));
  console.log('');
}

// Non-zero exit when quality regresses, so this can gate a release.
const FLOOR = Number(process.env.F1_FLOOR ?? 0);
process.exit(f1 >= FLOOR ? 0 : 1);
