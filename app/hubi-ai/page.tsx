// "Hubi AI-ga": can you tell when AI is wrong in Somali? Public, no account
// needed. Six real AI answers to judge, three optional questions about how
// the visitor uses AI, one row stored, plus progress events along the way. The deck lives in lib/hubi-ai.ts.

import Link from 'next/link';
import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { HUBI_ITEMS } from '@/lib/hubi-ai';
import { recordHubiEvent, submitHubiAi } from '@/lib/actions';
import HubiAi from '@/components/HubiAi';

export const metadata: Metadata = {
  title: 'Hubi AI-ga — Unkad',
  description: 'Six real AI answers in Somali. Can you tell which ones are wrong?',
};

export default async function HubiAiPage() {
  const lang = await getLang();
  const t = makeT(lang);

  const items = HUBI_ITEMS.map((it) => ({
    id: it.id,
    question: it.question,
    answer: it.answer,
    model: it.model,
    right: it.right,
    why: it.why[lang],
  }));

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/">&larr; Unkad</Link>
      </p>

      {/* VERIFY SOMALI: strings in lib/i18n.ts */}
      <h1 lang="so">{t('hubiTitle')}</h1>
      <p className="muted">{t('hubiIntro')}</p>

      <HubiAi
        items={items}
        action={submitHubiAi}
        record={recordHubiEvent}
        labels={{
          question: t('hubiQuestion'),
          btnRight: t('hubiBtnRight'),
          btnWrong: t('hubiBtnWrong'),
          correct: t('hubiCorrect'),
          wrong: t('hubiWrong'),
          next: t('hubiNext'),
          saidBy: t('hubiSaidBy'),
          profileTitle: t('hubiProfileTitle'),
          profileIntro: t('hubiProfileIntro'),
          qUse: t('hubiQUse'),
          useOpts: [t('hubiUseNever'), t('hubiUseSometimes'), t('hubiUseDaily')],
          qTrained: t('hubiQTrained'),
          trainedOpts: [t('hubiTrainedInternet'), t('hubiTrainedTaught'), t('hubiTrainedThinks'), t('hubiTrainedUnsure')],
          qFluent: t('hubiQFluent'),
          fluentOpts: [t('hubiFluentYes'), t('hubiFluentNo'), t('hubiFluentUnsure')],
          submit: t('hubiSubmit'),
          skip: t('hubiSkip'),
        }}
      />
    </div>
  );
}
