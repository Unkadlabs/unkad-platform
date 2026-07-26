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
export function isUsableSentence(s: string): boolean {
  return s.length >= 10 && s.split(/\s+/).length >= 3;
}

export function countSentences(raw: string | null | undefined): number {
  return splitSentences(raw).filter(isUsableSentence).length;
}
