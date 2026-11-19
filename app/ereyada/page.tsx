// Geedka ereyada: the words of the released corpus, drawn as trees.
//
// Two views, switched by ?v= so every state is a plain link that can be shared
// and works without JavaScript:
//
//   ?v=qoys&q=qor       word family: every word that begins with "qor"
//   ?v=weedho&q=dadka   phrase tree: what follows "dadka" across the corpus
//
// The data is the RELEASED corpus only (lib/words.ts), so nothing unreleased or
// unverified is shown. The Somali strings in lib/i18n.ts are drafts.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import {
  familyTree,
  nearWords,
  phraseTree,
  tokenize,
  topEndings,
  topFamilies,
  topWords,
  wordIndex,
  type TreeNode,
  type WordIndex,
} from '@/lib/words';

export const dynamic = 'force-dynamic';

const TITLE = 'Geedka ereyada';
const DESCRIPTION = 'Erey kasta oo ku jira kaydka Qor ee la daabacay, oo loo sawiray sidii geed.';
const URL = 'https://qor.unkad.com/ereyada';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { type: 'website', siteName: 'Qor Af-Soomaali', url: URL, title: TITLE, description: DESCRIPTION },
};

type Props = { searchParams: Promise<{ v?: string; q?: string }> };

const fmt = (n: number) => n.toLocaleString('en-US');

export default async function WordsPage({ searchParams }: Props) {
  const { v, q } = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);

  let idx: WordIndex;
  try {
    idx = await wordIndex();
  } catch {
    return (
      <div className="container">
        <h1 lang="so">{t('wordsTitle')}</h1>
        <p className="muted">{t('wordsUnavailable')}</p>
      </div>
    );
  }

  const view = v === 'weedho' ? 'weedho' : 'qoys';
  // One word only, letters and inner apostrophes, so a query can never be more
  // than a lookup key.
  const query = tokenize((q ?? '').slice(0, 40))[0] ?? '';

  const families = topFamilies(idx);
  const common = new Set(topWords(idx, 60).map(([w]) => w));
  const defaultPhrase = topWords(idx, 200, 4).find(([w]) => !common.has(w))?.[0] ?? 'dadka';
  const active = query || (view === 'qoys' ? families[0]?.stem ?? 'qor' : defaultPhrase);

  const link = (nextView: string, word: string) =>
    `/ereyada?v=${nextView}&q=${encodeURIComponent(word)}`;

  return (
    <div className="container words-page">
      <h1 lang="so">{t('wordsTitle')}</h1>
      <p className="muted">{t('wordsSub')}</p>

      <div className="stats">
        <div className="stat">
          <span className="n">{fmt(idx.words.length)}</span>
          <span className="label">{t('wordsDistinct')}</span>
        </div>
        <div className="stat">
          <span className="n">{fmt(idx.totalTokens)}</span>
          <span className="label">{t('wordsTotal')}</span>
        </div>
        <div className="stat">
          <span className="n">{Math.round((idx.hapax / idx.words.length) * 100)}%</span>
          <span className="label">{t('wordsOnce')}</span>
        </div>
        <div className="stat">
          <span className="n">{fmt(idx.sentences.length)}</span>
          <span className="label">{t('wordsSentences')}</span>
        </div>
      </div>

      <nav className="words-tabs" aria-label={t('wordsTitle')}>
        <Link
          href={link('qoys', view === 'qoys' ? active : families[0]?.stem ?? 'qor')}
          aria-current={view === 'qoys' ? 'page' : undefined}
        >
          {t('wordsTabFamilies')}
        </Link>
        <Link
          href={link('weedho', view === 'weedho' ? active : defaultPhrase)}
          aria-current={view === 'weedho' ? 'page' : undefined}
        >
          {t('wordsTabPhrases')}
        </Link>
      </nav>

      <form className="words-search" action="/ereyada" method="get" role="search">
        <input type="hidden" name="v" value={view} />
        <label htmlFor="words-q" className="sr-only">
          {t('wordsSearch')}
        </label>
        <input
          id="words-q"
          name="q"
          type="search"
          lang="so"
          defaultValue={query}
          placeholder={t('wordsSearch')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
        />
        <button type="submit" className="btn">
          {t('wordsSearchBtn')}
        </button>
      </form>

      {view === 'qoys' ? (
        <FamiliesView idx={idx} stem={active} families={families} t={t} link={link} />
      ) : (
        <PhrasesView idx={idx} word={active} t={t} link={link} />
      )}

      <p className="muted words-source">{t('wordsSource')}</p>
    </div>
  );
}

type T = ReturnType<typeof makeT>;
type LinkFn = (view: string, word: string) => string;

function FamiliesView({
  idx,
  stem,
  families,
  t,
  link,
}: {
  idx: WordIndex;
  stem: string;
  families: { stem: string; forms: number }[];
  t: T;
  link: LinkFn;
}) {
  const tree = familyTree(idx, stem);
  const endings = topEndings(idx);
  const maxEnding = Math.max(1, ...endings.map((e) => e.words));

  return (
    <>
      <p className="muted words-help">{t('wordsFamiliesHelp')}</p>

      <div className="words-chips" aria-label={t('wordsPickFamily')}>
        {families.map((f) => (
          <Link
            key={f.stem}
            href={link('qoys', f.stem)}
            className="words-chip"
            aria-current={f.stem === stem ? 'true' : undefined}
            lang="so"
          >
            {f.stem}
            <span>{f.forms}</span>
          </Link>
        ))}
      </div>

      {tree ? (
        <WordTree root={tree} kind="family" t={t} link={link} />
      ) : (
        <NotFound idx={idx} word={stem} view="qoys" t={t} link={link} />
      )}

      <h2>{t('wordsEndings')}</h2>
      <p className="muted words-help">{t('wordsEndingsHelp')}</p>
      <ol className="words-bars">
        {endings.map((e) => (
          <li key={e.ending}>
            <span className="words-bar-label" lang="so">
              -{e.ending}
            </span>
            <span className="words-bar-track">
              <span className="words-bar-fill" style={{ width: `${(e.words / maxEnding) * 100}%` }} />
            </span>
            <span className="words-bar-n">{fmt(e.words)}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function PhrasesView({ idx, word, t, link }: { idx: WordIndex; word: string; t: T; link: LinkFn }) {
  const result = phraseTree(idx, word);
  const top = topWords(idx, 48, 3);
  const maxTop = top[0]?.[1] ?? 1;

  return (
    <>
      <p className="muted words-help">{t('wordsPhrasesHelp')}</p>

      {result ? (
        <>
          <p className="words-count">
            <strong lang="so">{word}</strong> · {fmt(result.occurrences)} {t('wordsFollows')}
          </p>
          <WordTree root={result.tree} kind="phrase" t={t} link={link} />
        </>
      ) : (
        <NotFound idx={idx} word={word} view="weedho" t={t} link={link} />
      )}

      <h2>{t('wordsTop')}</h2>
      <div className="words-cloud" lang="so">
        {top.map(([w, n]) => (
          <Link
            key={w}
            href={link('weedho', w)}
            style={{ fontSize: `${0.85 + 0.9 * Math.sqrt(n / maxTop)}rem` }}
            aria-current={w === word ? 'true' : undefined}
            title={`${fmt(n)}`}
          >
            {w}
          </Link>
        ))}
      </div>
    </>
  );
}

function NotFound({
  idx,
  word,
  view,
  t,
  link,
}: {
  idx: WordIndex;
  word: string;
  view: string;
  t: T;
  link: LinkFn;
}) {
  const near = nearWords(idx, word);
  return (
    <div className="card words-missing">
      <p>
        <strong lang="so">{word}</strong>: {t('wordsNotFound')}
      </p>
      {near.length > 0 && (
        <p>
          {t('wordsNear')}:{' '}
          {near.map((w, i) => (
            <span key={w}>
              {i > 0 && ', '}
              <Link href={link(view, w)} lang="so">
                {w}
              </Link>
            </span>
          ))}
        </p>
      )}
      <p>
        <Link href="/contribute">{t('wordsMissingCta')}</Link>
      </p>
    </div>
  );
}

// The tree. Branch thickness and label size follow how common a branch is, so
// the shape of the corpus is visible before any number is read.
function WordTree({
  root,
  kind,
  t,
  link,
}: {
  root: TreeNode;
  kind: 'family' | 'phrase';
  t: T;
  link: LinkFn;
}) {
  const total = Math.max(1, root.count);
  const weight = (n: number) => Math.sqrt(n / total);

  const Node = ({ node, depth }: { node: TreeNode; depth: number }) => {
    const w = weight(node.count);
    // In a family, a branch that ends a real word links to how that word is
    // used. In a phrase tree, each branch links to its own first word's tree.
    const target =
      kind === 'family' ? node.full : depth === 0 ? null : node.label.split(' ')[0];
    const label = (
      <>
        <span className="wt-label" lang="so" style={{ fontSize: `${0.9 + 0.75 * w}rem` }}>
          {kind === 'family' && depth > 0 ? `-${node.label}` : node.label}
        </span>
        {kind === 'family' && node.full && depth > 0 && (
          <span className="wt-full" lang="so">
            {node.full}
          </span>
        )}
        <span className="wt-count">{fmt(node.count)}</span>
      </>
    );
    return (
      <li style={{ ['--w' as string]: `${1 + Math.round(5 * w)}px` }}>
        {target ? (
          <Link className="wt-node" href={link('weedho', target)}>
            {label}
          </Link>
        ) : (
          <span className="wt-node">{label}</span>
        )}
        {(node.children.length > 0 || node.more > 0) && (
          <ul>
            {node.children.map((c, i) => (
              <Node key={`${c.label}-${i}`} node={c} depth={depth + 1} />
            ))}
            {node.more > 0 && (
              <li className="wt-more" style={{ ['--w' as string]: '1px' }}>
                <span className="wt-node">
                  +{fmt(node.more)} {t('wordsMore')}
                </span>
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="wt-scroll">
      <ul className="wt" aria-label={kind === 'family' ? t('wordsTabFamilies') : t('wordsTabPhrases')}>
        <Node node={root} depth={0} />
      </ul>
    </div>
  );
}
