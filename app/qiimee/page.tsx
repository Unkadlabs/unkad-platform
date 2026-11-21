// /qiimee: the public blind vote for the study "does Qor in context make
// Claude write better Somali?" (research repo unkad-qor-context, Deviation 3).
// One set of three AI-written essays per screen; the voter picks the most and
// the least natural Somali. Never shows which model or condition wrote what,
// and shows no per-essay results before voting closes; only vote counts.
// Somali strings are drafts in lib/i18n.ts (qTitle ...).

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { castBlindVote } from '@/lib/actions';
import {
  BLIND_SETS,
  LETTERS,
  NATIVE_COOKIE,
  currentVoterKey,
  displayOrder,
  isClosed,
  nextSet,
  voteTotals,
  votedSets,
} from '@/lib/blind';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

const TITLE = 'Qoraalkee Af-Soomaaligiisu wanaagsanyahay?'; // founder-verified 2026-11-21
const DESCRIPTION = 'Akhri saddex qoraal oo AI qoray, kadib dooro midka Af-Soomaaligiisu ugu dabiicsan yahay.';
const URL = 'https://qor.unkad.com/qiimee';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { type: 'website', siteName: 'Qor Af-Soomaali', url: URL, title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

type Props = { searchParams: Promise<{ done?: string; error?: string; set?: string }> };

const fmt = (n: number) => n.toLocaleString('en-US');

export default async function QiimeePage({ searchParams }: Props) {
  const { done, error, set: errSet } = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);

  const totals = await voteTotals();
  const counter = (
    <p className="mono muted q-counter">
      {fmt(totals.votes)} {t('qVotes')} · {fmt(totals.voters)} {t('qVoters')}
    </p>
  );

  if (isClosed()) {
    return (
      <div className="container q-page">
        <h1 lang="so">{t('qTitle').replace(/-/g, '\u2011')}</h1>
        <p className="notice">{t('qClosed')}</p>
        {counter}
      </div>
    );
  }

  const voterKey = await currentVoterKey();
  const doneSets = await votedSets(voterKey);
  // After a validation error, show the same set again; otherwise the next one.
  const retry = error && errSet ? BLIND_SETS.find((s) => s.id === errSet && !doneSets.has(s.id)) : undefined;
  const set = retry ?? (await nextSet(voterKey, doneSets));
  const native = (await cookies()).get(NATIVE_COOKIE)?.value;
  const order = set ? displayOrder(voterKey, set.id) : null;
  const errorKey =
    error === 'same' ? 'qErrSame' : error === 'missing' ? 'qErrMissing' : error === 'rate' ? 'qErrRate' : null;

  return (
    <div className="container q-page">
      <h1 lang="so">{t('qTitle').replace(/-/g, '\u2011')}</h1>
      <p className="q-lede">{t('qIntro')}</p>
      <p className="muted q-why">
        {t('qWhy')} {t('qClosesAt')}
      </p>
      {counter}

      {done && (
        <p className="notice rise">
          {t('qThanks')} {set && t('qNextHint')}
        </p>
      )}
      {errorKey && (
        <p className="notice notice-error rise" role="alert">
          {t(errorKey)}
        </p>
      )}
      {doneSets.size > 0 && set && (
        <p className="mono muted">{t('qProgress').replace('{n}', String(doneSets.size))}</p>
      )}

      {!set ? (
        <p className="notice">{t('qAllDone')}</p>
      ) : (
        <form action={castBlindVote} className="q-form" key={set.id}>
          <input type="hidden" name="setId" value={set.id} />
          <input type="hidden" name="shownAt" value={Date.now()} />
          <input type="hidden" name="order" value={order!.map((i) => LETTERS[i]).join('')} />
          <div className="q-essays">
            {order!.map((idx, pos) => {
              // On screen the essays are always labelled A, B, C top to bottom;
              // the vote carries the set's own letter for the essay shown here.
              const shown = LETTERS[pos];
              const real = LETTERS[idx];
              return (
                <article className="q-essay" key={real}>
                  <h2 className="q-essay-head">
                    {t('qEssay')} {shown}
                  </h2>
                  <div className="q-text" lang="so">
                    {set.essays[idx]}
                  </div>
                  <div className="q-picks" role="group" aria-label={`${t('qEssay')} ${shown}`}>
                    <label className="q-pick q-pick-best">
                      <input type="radio" name="best" value={real} required />
                      <span>{t('qBest')}</span>
                    </label>
                    <label className="q-pick q-pick-worst">
                      <input type="radio" name="worst" value={real} required />
                      <span>{t('qWorst')}</span>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>

          <fieldset className="q-native">
            <legend>{t('qNative')}</legend>
            <label>
              <input type="radio" name="native" value="yes" defaultChecked={native === 'yes'} /> {t('qYes')}
            </label>
            <label>
              <input type="radio" name="native" value="no" defaultChecked={native === 'no'} /> {t('qNo')}
            </label>
          </fieldset>

          <SubmitButton className="btn q-submit" label={t('qSubmit')} />
        </form>
      )}
    </div>
  );
}
