// The words of the released corpus, as trees.
//
// Two views over the same index:
//
//   Families  Words that share a beginning, drawn as a branching tree. Somali
//             builds words by adding endings to a stem (qor, qoray, qoraal,
//             qoraallo), so a prefix tree shows the morphology without any
//             linguistic rules written down here.
//   Phrases   Pick a word and see what follows it across every sentence: the
//             classic "word tree". Shows how a word is actually used.
//
// Only the RELEASED corpus is read, the same sentences.jsonl that Hugging Face
// serves publicly under CC BY-SA 4.0. Nothing unreleased or unverified reaches
// this page, which is what keeps it inside standing rule 5: the text shown is
// already public, and the page only rearranges it.

const HF_SENTENCES =
  process.env.WORDS_SOURCE ??
  process.env.ORG_REVIEW_SOURCE ??
  'https://huggingface.co/datasets/unkadlabs/qor-af-soomaali/resolve/main/data/sentences.jsonl';

// Same reasoning as lib/org-review.ts: about 1.4 MB, so it is fetched once an
// hour per server instance rather than through Next's fetch cache.
const TTL = 60 * 60 * 1000;

export type WordIndex = {
  sentences: string[][]; // tokens per sentence
  freq: Map<string, number>;
  words: string[]; // distinct, sorted
  totalTokens: number;
  hapax: number; // words seen exactly once
  builtAt: number;
};

let memo: WordIndex | null = null;

// Somali is written in Latin a-z with the apostrophe as the glottal stop
// (su'aal, ba'an), so a word is letters with optional inner apostrophes.
// Curly apostrophes are normalised first; digits and punctuation are dropped.
export function tokenize(text: string): string[] {
  return (
    text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[‘’ʼ`]/g, "'")
      .match(/[a-z]+(?:'[a-z]+)*/g) ?? []
  );
}

export async function wordIndex(): Promise<WordIndex> {
  if (memo && Date.now() - memo.builtAt < TTL) return memo;

  let raw: string;
  try {
    const res = await fetch(HF_SENTENCES, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Hugging Face returned ${res.status}`);
    raw = await res.text();
  } catch (err) {
    // Keep serving the last good index rather than an empty page.
    if (memo) return memo;
    throw err;
  }

  const sentences: string[][] = [];
  const freq = new Map<string, number>();
  let totalTokens = 0;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { text_so?: string };
    const toks = tokenize(row.text_so ?? '');
    if (toks.length === 0) continue;
    sentences.push(toks);
    totalTokens += toks.length;
    for (const w of toks) freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  let hapax = 0;
  for (const n of freq.values()) if (n === 1) hapax++;

  memo = {
    sentences,
    freq,
    words: [...freq.keys()].sort(),
    totalTokens,
    hapax,
    builtAt: Date.now(),
  };
  return memo;
}

// ---- Shared tree shape -----------------------------------------------------

export type TreeNode = {
  label: string; // the text on this branch
  full: string | null; // the whole word ending here (families) or null
  count: number; // occurrences under this branch
  children: TreeNode[];
  more: number; // branches left out to keep the tree readable
};

// ---- Families ---------------------------------------------------------------

export type Family = { stem: string; forms: number; count: number };

// Somali writes dh, kh and sh as single letters, so "dha" is two letters, not
// three. Length checks below count letters the way a Somali reader does.
export function somaliLength(w: string): number {
  return w.replace(/dh|kh|sh/g, '#').length;
}

// Stems worth showing on the landing view: beginnings shared by many different
// words. A stem must itself be a word in the corpus (qor, bar, mar), which
// keeps out arbitrary beginnings like "saa", and the commonest function words
// are skipped because nearly everything starts like them. Picked greedily so
// the list does not fill up with nested versions of the same stem.
export function topFamilies(idx: WordIndex, limit = 18): Family[] {
  const common = new Set(topWords(idx, 60).map(([w]) => w));
  const forms = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const w of idx.words) {
    const n = idx.freq.get(w) ?? 0;
    for (let k = 3; k <= Math.min(8, w.length - 1); k++) {
      const p = w.slice(0, k);
      forms.set(p, (forms.get(p) ?? 0) + 1);
      counts.set(p, (counts.get(p) ?? 0) + n);
    }
  }

  const candidates = [...forms.entries()]
    .filter(
      ([stem, f]) =>
        f >= 5 &&
        somaliLength(stem) >= 3 &&
        // Stems end on a consonant (qor, dhaq); "baa" or "faa" is just a
        // syllable many unrelated words happen to begin with.
        !/[aeiou]$/.test(stem) &&
        (idx.freq.get(stem) ?? 0) >= 2 &&
        !common.has(stem)
    )
    .map(([stem, f]) => ({ stem, forms: f, count: counts.get(stem) ?? 0 }))
    // Longer stems are more meaningful, more forms is a richer family.
    .sort(
      (a, b) =>
        b.forms * Math.log2(somaliLength(b.stem)) - a.forms * Math.log2(somaliLength(a.stem))
    );

  const picked: Family[] = [];
  for (const c of candidates) {
    if (picked.some((p) => c.stem.startsWith(p.stem) || p.stem.startsWith(c.stem))) continue;
    picked.push(c);
    if (picked.length >= limit) break;
  }
  return picked.sort((a, b) => b.forms - a.forms);
}

// Every word starting with `stem`, as a compressed prefix tree: each branch is
// the run of letters until the next split, so qoraal and qoraallo hang off a
// single "aal" branch instead of three one-letter steps.
export function familyTree(
  idx: WordIndex,
  stem: string,
  maxChildren = 7,
  maxDepth = 3
): TreeNode | null {
  const s = stem.toLowerCase();
  const matches = idx.words.filter((w) => w.startsWith(s));
  if (matches.length === 0) return null;

  type Raw = { kids: Map<string, Raw>; end: number; count: number };
  const root: Raw = { kids: new Map(), end: 0, count: 0 };
  for (const w of matches) {
    const n = idx.freq.get(w) ?? 0;
    let node = root;
    node.count += n;
    for (const ch of w.slice(s.length)) {
      if (!node.kids.has(ch)) node.kids.set(ch, { kids: new Map(), end: 0, count: 0 });
      node = node.kids.get(ch)!;
      node.count += n;
    }
    node.end = n;
  }

  const build = (raw: Raw, label: string, prefix: string, depth: number): TreeNode => {
    // Collapse a straight run with no word ending part-way along it.
    let node = raw;
    let text = label;
    let word = prefix;
    while (node.end === 0 && node.kids.size === 1) {
      const [ch, next] = [...node.kids.entries()][0];
      text += ch;
      word += ch;
      node = next;
    }
    // Past maxDepth the rest is counted, not drawn: a tall family is still
    // readable at three levels, and any word in it is one search away.
    if (depth >= maxDepth) {
      return { label: text, full: node.end > 0 ? word : null, count: node.count, children: [], more: node.kids.size };
    }
    const kids = [...node.kids.entries()]
      .map(([ch, child]) => build(child, ch, word + ch, depth + 1))
      .sort((a, b) => b.count - a.count);
    return {
      label: text,
      full: node.end > 0 ? word : null,
      count: node.count,
      children: kids.slice(0, maxChildren),
      more: Math.max(0, kids.length - maxChildren),
    };
  };

  return build(root, s, s, 0);
}

// Endings shared by the most different words. Somali marks definiteness and
// case with suffixes (-ka, -ta, -ga, -kii, -tii), so these rise to the top on
// their own. Only words longer than the ending count, so "ka" the word is not
// mistaken for "-ka" the suffix.
export function topEndings(idx: WordIndex, limit = 12): { ending: string; words: number }[] {
  const by = new Map<string, number>();
  for (const w of idx.words) {
    for (const k of [2, 3]) {
      if (w.length > k + 1) {
        const e = w.slice(-k);
        by.set(e, (by.get(e) ?? 0) + 1);
      }
    }
  }
  return [...by.entries()]
    .map(([ending, words]) => ({ ending, words }))
    .sort((a, b) => b.words - a.words)
    .slice(0, limit);
}

// ---- Phrases ----------------------------------------------------------------

// What follows `word`, up to `depth` words on, merged into a tree. Branches
// seen only once are folded away below the first level so the shape of common
// usage shows rather than every individual sentence.
export function phraseTree(
  idx: WordIndex,
  word: string,
  depth = 4,
  maxChildren = 7
): { tree: TreeNode; occurrences: number } | null {
  const w = word.toLowerCase();
  type Raw = { kids: Map<string, Raw>; count: number };
  const root: Raw = { kids: new Map(), count: 0 };

  for (const toks of idx.sentences) {
    for (let i = 0; i < toks.length; i++) {
      if (toks[i] !== w) continue;
      root.count++;
      let node = root;
      for (const next of toks.slice(i + 1, i + 1 + depth)) {
        if (!node.kids.has(next)) node.kids.set(next, { kids: new Map(), count: 0 });
        node = node.kids.get(next)!;
        node.count++;
      }
    }
  }
  if (root.count === 0) return null;

  const build = (raw: Raw, label: string, level: number): TreeNode => {
    // Merge a chain that never splits into one phrase branch.
    let node = raw;
    let text = label;
    while (node.kids.size === 1) {
      const [next, child] = [...node.kids.entries()][0];
      if (child.count !== node.count) break;
      text += ` ${next}`;
      node = child;
    }
    const all = [...node.kids.entries()].sort((a, b) => b[1].count - a[1].count);
    const kept = all.filter(([, c]) => level === 0 || c.count >= 2).slice(0, maxChildren);
    return {
      label: text,
      full: null,
      count: node.count,
      children: kept.map(([t, c]) => build(c, t, level + 1)),
      // A "+N more" under a branch whose every continuation was seen once
      // is noise; it is only worth saying where something was kept beside it.
      more: level === 0 || kept.length > 0 ? all.length - kept.length : 0,
    };
  };

  return { tree: build(root, w, 0), occurrences: root.count };
}

// For a word the corpus does not have: the nearest words it does, by shared
// beginning, so a search never dead-ends.
export function nearWords(idx: WordIndex, word: string, limit = 10): string[] {
  const w = word.toLowerCase();
  for (let k = w.length; k >= 2; k--) {
    const p = w.slice(0, k);
    const hits = idx.words.filter((x) => x.startsWith(p));
    if (hits.length) {
      return hits.sort((a, b) => (idx.freq.get(b) ?? 0) - (idx.freq.get(a) ?? 0)).slice(0, limit);
    }
  }
  return [];
}

export function topWords(idx: WordIndex, limit = 40, minLength = 1): [string, number][] {
  return [...idx.freq.entries()]
    .filter(([w]) => w.length >= minLength)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
