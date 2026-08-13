// Set or edit the personal weekly goal. One page, two numbers, one
// toggle. The share-of-100k preview under the form is the argument
// for setting a goal at all: your slice, visibly moving the total.

import Link from 'next/link';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { getGoal } from '@/lib/goals';
import { corpusStats, CORPUS_GOAL } from '@/lib/stats';
import GoalForm from '@/components/GoalForm';

export default async function GoalPage() {
  const user = await requireOnboarded();
  const lang = await getLang();
  const t = makeT(lang);

  const [goal, corpus] = await Promise.all([getGoal(user.id), corpusStats()]);
  const remaining = Math.max(0, CORPUS_GOAL - corpus.accepted);

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/home">&larr; {t('navHome')}</Link>
      </p>

      <h1>{t('goalCardTitle')}</h1>
      <p className="muted">{t('goalSetHint')}</p>

      <GoalForm
        initialWrite={goal?.weeklyWrite ?? 20}
        initialValidate={goal?.weeklyValidate ?? 30}
        initialNotify={goal?.notify ?? true}
        remaining={remaining}
        labels={{
          write: t('goalWriteLabel'),
          validate: t('goalValidateLabel'),
          notify: t('goalNotifyLabel'),
          notifyHint: t('goalNotifyHint'),
          save: t('goalSave'),
          clearHint: t('goalClearHint'),
          shareOf: t('goalShareOf'),
          pace: t('goalPace'),
        }}
      />

      <p className="hint" style={{ marginTop: '1.5rem' }}>
        {t('goalShareLine')}
      </p>
    </div>
  );
}
