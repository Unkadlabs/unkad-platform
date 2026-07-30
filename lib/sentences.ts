// Splitting Somali text into sentences.
//
// Every counter on the platform tracks characters, but the milestones the
// campaign actually promises are stated in sentences: 2,000 to benchmark a
// model, 50,000 to finetune one. Those units are not interchangeable. One
// contributor's 2,900-character essay and 2,900 characters of short translated
// lines are worth very different amounts to a benchmark, and only the sentence
// count tells them apart.

// Split on terminal punctuation and on hard line breaks. Contributors writing
// lists put one item per line with no full stop, and those are real sentences.
// Somali has no sentence-ending abbreviations of the sort that make this
// unreliable in English ("Dr.", "etc."), so the naive split is safe here.
export function splitSentences(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(/\r/g, '')
    .split(/(?<=[.!?؟۔])\s+|\n+/)
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
// `Law = xeer`, `Bail = dammiin` and `[ الإنسان: 9]`, none of which is a
// sentence of Somali. The rules below remove that class of debris. They are
// deliberately narrow: each targets a shape that cannot be a sentence, rather
// than guessing at quality.

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

// A bracketed reference standing alone: `[ الإنسان: 9]`, `(Sura 2:255)`.
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
