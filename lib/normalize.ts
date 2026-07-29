// Character normalisation for published text.
//
// People write on phones, and phone keyboards and chat apps silently
// "beautify" punctuation: straight apostrophes become curly, hyphens become
// non-breaking hyphens, spaces become non-breaking spaces. A reader never
// notices. A tokenizer does: `mas'uuliyadda` and `mas’uuliyadda` are different
// strings, so a model that answers with the ordinary apostrophe scores wrong
// against a reference that happens to carry the curly one. In a benchmark that
// is a measurement error dressed up as a model failure.
//
// About a quarter of the corpus carried at least one of these on 30 Jul 2026.
//
// This runs at export, never on the stored row. What a contributor wrote is
// what the database keeps: normalising in place would rewrite their words to
// suit a downstream format, and the platform's rule is that nobody's text gets
// silently changed. The dataset card documents that published text is
// normalised, so anyone reproducing results knows exactly what they have.
//
// Deliberately conservative. Only characters with an unambiguous plain
// equivalent are touched. Somali orthography is left alone: the apostrophe
// marking the glottal stop stays an apostrophe, it just becomes the ordinary
// one, and no letter, vowel or diacritic is altered.

const REPLACEMENTS: [RegExp, string][] = [
  // Quotation marks and apostrophes, curly to straight. The Somali glottal
  // stop is written with an apostrophe, so this affects real words, not just
  // decoration: mas’uuliyadda → mas'uuliyadda.
  [/[‘’‛′]/g, "'"],
  [/[“”‟″]/g, '"'],

  // Non-breaking and figure hyphens to an ordinary hyphen. These are invisible
  // in rendering and distinct to every tokenizer.
  [/[‑‒]/g, '-'],

  // Spaces that are not the space character: non-breaking, narrow, thin,
  // ideographic. All become a single ordinary space.
  [/[       　]/g, ' '],

  // Zero-width characters carry no meaning here and break string comparison
  // wherever they land.
  [/[​‌‍⁠﻿]/g, ''],

  // Ellipsis character to three dots, so sentence splitting behaves the same
  // way on both forms.
  [/…/g, '...'],

  // Windows line endings, then runs of whitespace inside a line. Newlines are
  // preserved: they carry paragraph structure and the sentence splitter uses
  // them.
  [/\r\n?/g, '\n'],
  [/[ \t]{2,}/g, ' '],
  [/[ \t]+\n/g, '\n'],
];

// En and em dashes are NOT replaced. They are legitimate punctuation that
// several contributors use deliberately, and flattening them to a hyphen would
// change how a sentence reads rather than how it encodes.

export function normalizeForRelease(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);
  return out.trim();
}

// Whether normalisation would change anything, for reporting how much of a
// release was affected without diffing every row by hand.
export function needsNormalizing(text: string): boolean {
  return normalizeForRelease(text) !== text.trim();
}
