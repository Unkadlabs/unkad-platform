// Types for the plain-JavaScript segmenter in sentences.mjs.
//
// The implementation is JS so that node scripts and the Next.js app can share
// one definition; these declarations give the app the same type safety it had
// when the implementation was TypeScript.

/** Split Somali text into sentences, rejoining soft-wrapped lines. */
export function splitSentences(raw: string | null | undefined): string[];

/** Whether a split fragment is a whole sentence worth counting or publishing. */
export function isUsableSentence(s: string): boolean;

/** Count the usable sentences in a passage. The unit every milestone uses. */
export function countSentences(raw: string | null | undefined): number;
