// Splitting Somali text into sentences.
//
// Every counter on the platform tracks characters, but the milestones the
// campaign actually promises are stated in sentences: 2,000 to benchmark a
// model, 50,000 to finetune one. Those units are not interchangeable. One
// contributor's 2,900-character essay and 2,900 characters of short translated
// lines are worth very different amounts to a benchmark, and only the sentence
// count tells them apart.
//
// ---------------------------------------------------------------------------
// Why this is hand-written
//
// Corpus builders normally reach for a trained segmenter: Punkt, PySBD, spaCy,
// Stanza, or the Moses/SRX rules used in machine-translation pipelines. None of
// them supports Somali. There is no Somali model in spaCy or Stanza, no Somali
// rule set in PySBD, and no Somali Universal Dependencies treebank to train on.
// So there is no standard to adopt, only one to write and then measure.
//
// Measured against the 1,570 sentences in release v0.1.1, the earlier naive
// version produced roughly a 0.7% bad-cut rate. That was survivable because
// Somali lacks English's abbreviation problem: across every document in the
// corpus, exactly one token was followed by a period and then a lowercase
// letter, where English prose would show hundreds of "Dr." and "etc.". The
// hazards that remained were decimals, ellipses, initials, and line breaks
// used for soft wrapping. Each is handled below.
//
// scripts/sentence-eval.mjs scores this against a human-annotated gold set, so
// the claim "0.7%" stops being an estimate and becomes a number that can be
// reported and defended.

// Periods that do not end a sentence. Masked before splitting and restored
// after, which is the standard technique and avoids a regex that has to be
// correct about everything at once.
const PROTECTED: RegExp[] = [
  // Decimals and thousands separators: 1.5, 299.792.458
  /\d\.\d/g,
  // Ellipsis, whether spaced or not
  /\.\.\./g,
  // Initials: M.A., A.B.C.
  /\b[A-Z]\.(?=[A-Z]\.)/g,
  /\b[A-Z]\.(?=\s+[A-Z][a-z])/g,
  // Titles, which are always followed by a name and so never end a sentence:
  // `sh. Maxamed` is Sheekh Maxamed, one noun phrase.
  /\b(sh|dr|prof|md|eng|mr|mrs)\./gi,
  // Sentence-final abbreviations, protected only when a lowercase word follows.
  // `iwm.` is iyo wixii la mid ah, Somali's "etc.", and it frequently does end
  // a sentence: in `hilib, iwm. Kadib waan seexday` the period closes the
  // sentence and the capital that follows is the proof. Protecting it
  // unconditionally welded two sentences together, which is the opposite of the
  // fault this list exists to prevent.
  // Case-sensitive on purpose: with the /i flag the `[a-z]` lookahead also
  // matches a capital, so `iwm. Kadib` was treated as mid-sentence and the two
  // sentences were welded together. The casings a contributor actually writes
  // are listed instead.
  /\b(iwm|Iwm|IWM|tus|Tus|no|No)\.(?=\s+[a-z])/g,
];

const MASK = '';

function maskProtected(text: string): string {
  let out = text;
  for (const re of PROTECTED) {
    out = out.replace(re, (m) => m.replace(/\./g, MASK));
  }
  return out;
}

const unmask = (s: string) => s.split(MASK).join('.');

// Whether a line break is a real sentence boundary or a soft wrap.
//
// Splitting on every newline was the largest remaining source of bad cuts: a
// contributor who pressed Enter to wrap a long line had their sentence cut in
// half. A break is treated as a boundary when the text around it says so, and
// otherwise the two lines are rejoined with a space.
function isBoundaryBreak(before: string, after: string): boolean {
  if (!before.trim() || !after.trim()) return true; // blank line: paragraph break
  if (/[.!?؟۔:]["'”’)]?\s*$/.test(before)) return true; // previous line ended
  if (/^\s*([-–—•*➤]|\d+[.)aA]|[A-Z][a-zA-Z']*\s*:)/.test(after)) return true; // list item or speaker label
  if (/^\s*[A-Z]/.test(after)) return true; // next line starts a new sentence
  return false; // soft wrap
}

export function splitSentences(raw: string | null | undefined): string[] {
  if (!raw) return [];

  // Rejoin soft-wrapped lines first, so the sentence split below sees whole
  // sentences rather than fragments.
  const lines = raw.replace(/\r/g, '').split('\n');
  const joined: string[] = [];
  for (const line of lines) {
    if (joined.length === 0) {
      joined.push(line);
      continue;
    }
    const prev = joined[joined.length - 1];
    if (isBoundaryBreak(prev, line)) joined.push(line);
    else joined[joined.length - 1] = `${prev.replace(/\s+$/, '')} ${line.trim()}`;
  }

  return joined
    .flatMap((block) =>
      maskProtected(block)
        .split(/(?<=[.!?؟۔])\s+/)
        .map(unmask)
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

// A benchmark row has to be a whole sentence. Three words and ten characters
// is the floor: it drops headings, stray numbering and one-word fragments
// without touching short but complete lines like "Suuqu waa xiran yahay."
//
// The length floor alone is not enough. Long documents contain glossaries,
// citations and scriptural quotations, and splitting on line breaks turns each
// of those into a "sentence". The first published release carried rows like
// `Law = xeer` and `[ الإنسان: 9]`, neither of which is a sentence of Somali.
// The rules below remove that class of debris. They are deliberately narrow:
// each targets a shape that cannot be a sentence, rather than guessing at
// quality.

// `Law = xeer`, `Judge = garsoore`. A term, an equals sign, its gloss.
//
// Only the equals sign counts. A colon looked like the same shape and is not:
// contributors write dialogue as `Tukaanle : wa diyaar` and
// `Macmiilka : qiimaha wa immisa`, speaker-labelled conversation turns, which
// are among the most useful rows in the corpus. A colon rule deleted those
// along with the glossaries, so the colon is left alone and a handful of
// `fursad : carabi` lines survive. Keeping conversation is worth more than
// removing four glossary rows.
//
// The terminal-punctuation guard stays: without it this also caught
// `Falsafaddu waxay dhahdaa: wax walba waa dhici kara.`, a real sentence.
function isGlossaryLine(s: string): boolean {
  if (/[.!?؟۔]$/.test(s)) return false;
  const m = s.match(/^([^=]+)=([^=]+)$/);
  if (!m) return false;
  const words = (part: string) => part.trim().split(/\s+/).filter(Boolean).length;
  return words(m[1]) <= 4 && words(m[2]) <= 4;
}

// A bracketed reference standing alone: `[ الإنسان: 9]`, `(Suuratul Nuux: 15)`.
const CITATION_ONLY = /^[[(][^\])]*[\])][.,;]?$/;

// Somali is written in Latin script. A line whose letters are mostly not Latin
// is a quotation in another script, most often Arabic scripture, and belongs to
// the document it came from rather than to a list of Somali sentences.
function mostlyLatin(s: string): boolean {
  const latin = (s.match(/[A-Za-z]/g) ?? []).length;
  const other = (s.match(/[؀-ۿݐ-ݿЀ-ӿ]/g) ?? []).length;
  return latin > other;
}

export function isUsableSentence(s: string): boolean {
  if (s.length < 10) return false;
  if (s.split(/\s+/).length < 3) return false;
  if (isGlossaryLine(s)) return false;
  if (CITATION_ONLY.test(s)) return false;
  if (!mostlyLatin(s)) return false;
  // At least two real words, so a line of numbers, symbols or single letters
  // cannot pass on word count alone.
  const words = s.match(/[A-Za-z]{2,}/g) ?? [];
  return words.length >= 2;
}

export function countSentences(raw: string | null | undefined): number {
  return splitSentences(raw).filter(isUsableSentence).length;
}
