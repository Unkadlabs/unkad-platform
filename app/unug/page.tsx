// "Unug mise Qof?" — public guessing game: which sentences did the lab's
// tiny model write, and which came from real contributors? No auth, no DB
// writes; the deck is fixed below. Human sentences are drawn from the
// RELEASED (already public) corpus only; Unug lines are raw output from the
// wiki-pretrained, Qor-finetuned checkpoint (unug repo, 2026-08-23).

import Link from 'next/link';
import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import UnugGame, { type GameItem } from '@/components/UnugGame';

export const metadata: Metadata = {
  title: 'Unug mise Qof? — Unkad',
  description: 'Guess which Somali sentences were written by Unug, the tiny AI, and which by real people.',
};

// Deck: 5 released human sentences + 5 raw Unug outputs. VERIFY SOMALI does
// not apply to sentence text (human lines are contributor originals shown
// verbatim; Unug lines are machine output shown verbatim).
const ITEMS: GameItem[] = [
  { text: 'Sida ugu fiican ee gacmaha loo dhaqo waa in la adeegsadaa biyo iyo jeemis dile', unug: false },
  { text: 'Dadka qaarkood ee ugu muhiimsan ayaa adeegsanaya in aan u dhacayso.', unug: true },
  { text: 'Maanta waa maalin uu jawigu dhexdhexaad yahay', unug: false },
  { text: 'Waxaan kaa gale kuu walaalan karaa noloshaada.', unug: true },
  { text: 'Marka ugu horeeyso mirta ayaa la geliyaa dhulka, kadib biyo ayaa lagu shubaa', unug: false },
  { text: 'Dadka kale waxaa ka fogaadhaa gabayga Afrika.', unug: true },
  { text: 'Sabuun ayaa lagu dhaqaa hoosna waa loo dhaqaa', unug: false },
  { text: 'Dadkaas ayaa ah khasaaradda waxaa ka dhacay samir badan.', unug: true },
  { text: 'maanta cimiladu waa kuleel dhex dhexaad ah ma jirto dabeel xoogan oo laga fikiro', unug: false },
  { text: 'Waa in aan la siiyo dartaa magaalooyinka ugu diro fiican la nooleynayo.', unug: true },
];

export default async function UnugGamePage() {
  const lang = await getLang();
  const t = makeT(lang);

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/">&larr; Unkad</Link>
      </p>

      {/* VERIFY SOMALI: game strings in lib/i18n.ts */}
      <h1 lang="so">{t('unugGameTitle')}</h1>
      <p className="muted">{t('unugGameIntro')}</p>

      <UnugGame
        items={ITEMS}
        labels={{
          question: t('unugGameQuestion'),
          btnUnug: t('unugGameBtnUnug'),
          btnHuman: t('unugGameBtnHuman'),
          correct: t('unugGameCorrect'),
          wrong: t('unugGameWrong'),
          wasUnug: t('unugGameWasUnug'),
          wasHuman: t('unugGameWasHuman'),
          next: t('unugGameNext'),
          scoreTitle: t('unugGameScoreTitle'),
          scoreLine: t('unugGameScoreLine'),
          perfect: t('unugGamePerfect'),
          fooled: t('unugGameFooled'),
          playAgain: t('unugGamePlayAgain'),
          cta: t('unugGameCta'),
          ctaBtn: t('unugGameCtaBtn'),
        }}
      />
    </div>
  );
}
