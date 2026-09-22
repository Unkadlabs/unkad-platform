// "Hubi AI-ga": can you tell when AI is wrong in Somali?
//
// The deck is real model output, collected 2026-09-20 through OpenRouter at
// temperature 0 (two more added 22 Sep), shown verbatim (whitespace collapsed, one answer trimmed to
// its first sentences). Nothing is invented: every `answer` is what the named
// model actually said to the named question. What IS ours is the verdict on
// each answer and the one-line explanation, and those are drafts until the
// founder confirms them: !! VERIFY SOMALI !! applies to `why`, and the
// `right` flag itself needs a native check.
//
// Three literacy questions follow the deck. Their coded values are what the
// analysis stores; the wording lives in lib/i18n.ts.

export type HubiItem = {
  id: string;
  question: string;
  answer: string;
  model: string;
  right: boolean;
  why: { so: string; en: string };
};

export const HUBI_ITEMS: HubiItem[] = [
  {
    id: 'abeeso',
    // Chosen by the founder 22 Sep 2026; GPT-5.6 answer collected the same day.
    question: 'Maxaa loo sameeyaa marka qof abeeso qaniinto?',
    answer:
      'Qofka isla markiiba geeya isbitaal, kana fogee inuu socdo; xubin qaniintay ha dhaqaajin, ku xiro maro dabacsan, kana saar faraanti ama wax ciriiri ah. Ha jarin ama nuugin nabarka, ha saarin baraf ama daawo dhaqameed, hana isku dayin inaad qabato abeesada.',
    model: 'GPT-5.6',
    right: true,
    why: {
      so: 'Sax. Isbitaal, xubinta ha dhaqaajin, ha jarin, ha nuugin. Waa talada saxda ah.',
      en: 'Right. Hospital, keep the limb still, do not cut or suck. That is the correct advice.',
    },
  },
  },
  {
    id: 'dardaaran',
    question: 'Yaa qoray gabayga Dardaaran?',
    answer:
      'Dardaaran waa magac gabay oo loogu yeero gabayga ugu wayn ee Soomaalida. Waxaa loo yaqaanaa "Dardaaran" sababtoo ah wuxuu ka kooban yahay sadex gabay oo isku xig xig, kuwaas oo kala ah: "Gabay Xadiis", "Gabay Dhiirane", iyo "Gabay Jiifto".',
    model: 'Llama 3.3 70B',
    right: false,
    why: {
      so: 'Khalad. Saddexdaas gabay ma jiraan. AI-gu wuu been-abuuray, isagoo si fasiix ah u hadlaya.',
      en: 'Wrong. Those three poems do not exist. The AI invented them, fluently.',
    },
  },
  {
    id: 'caano',
    // Question wording by the founder (22 Sep 2026); answer re-collected the same day.
    question: "Waa maxay faa'iidada caafimaad ee caanaha geela laga helo?",
    answer:
      'Caanaha geelu waxay hodan ku yihiin borotiin, kalsiyam, fiitamiino iyo macdano, waxayna taageeri karaan lafaha, murqaha iyo difaaca jirka. Dadka qaar waxay u dheefshiidaan si ka fudud caanaha lo’da, balse ma aha daawo lagu beddelo talada dhakhtarka.',
    model: 'GPT-5.6',
    right: true,
    why: {
      so: 'Sax. Waxa la yiri waa run guud ahaan.',
      en: 'Right. What it says is broadly true.',
    },
  },
  {
    id: 'duumo',
    // Question wording corrected by the founder 22 Sep 2026; answer re-collected the same day.
    question: 'Sidee duumada loogu daweeyaa guriga?',
    answer: 'Guri wuxuu u baahan yahay duumal, waxaana loogu daweeyaa guri duumada loogu daweeyo guri.',
    model: 'Llama 3.3 70B',
    right: false,
    why: {
      so: 'Khalad. Jawaab ma aha; ereyo aan macno lahayn. Qofka duumada qaba waa in xarun caafimaad la geeyaa.',
      en: 'Wrong. Not an answer, just words. A person with malaria needs a clinic.',
    },
  },
  {
    id: 'ors',
    question: 'Maxay tahay ORS, goormaana la isticmaalaa?',
    answer:
      'ORS waa dareere cusbo iyo sonkor isku dheellitiran leh oo lagu beddelo biyaha iyo macdanta jirku lumiyo. Waxaa la isticmaalaa marka shuban, matag, ama kulayl badan ay keenaan fuuqbax.',
    model: 'GPT-5.6',
    right: true,
    why: {
      so: 'Sax. Sidaas ayaa ORS loo isticmaalaa.',
      en: 'Right. That is what ORS is for.',
    },
  },
  {
    id: 'maahmaah',
    question: 'Maxay ka dhigan tahay maahmaahda: Nin aan dhul lahayn dhulkiisa ha la joogo?',
    answer: 'Waxaan dhahaa: Ha la joogo.',
    model: 'Llama 3.3 70B',
    right: false,
    why: {
      so: 'Khalad. Jawaab ma aha; ereyada su’aasha ayuu dib u soo celiyay.',
      en: 'Wrong. It is not an answer; it repeated words from the question.',
    },
  },
];

// Literacy questions: coded values only. Wording is in lib/i18n.ts.
export const HUBI_PROFILE = {
  use: ['never', 'sometimes', 'daily'],
  trained: ['internet', 'taught', 'thinks', 'unsure'],
  fluent: ['yes', 'no', 'unsure'],
} as const;

export type HubiAnswer = { id: string; said: 'sax' | 'khalad'; correct: boolean };

export function scoreHubi(said: Record<string, 'sax' | 'khalad'>): { answers: HubiAnswer[]; score: number } {
  const answers = HUBI_ITEMS.map((it) => {
    const s = said[it.id];
    const correct = (s === 'sax') === it.right;
    return { id: it.id, said: s, correct };
  });
  return { answers, score: answers.filter((a) => a.correct).length };
}
