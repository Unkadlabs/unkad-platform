// Live room results for Hubi AI-ga, built to be screen-shared during an
// event: how many people played, and for each item whether the AI was right
// and what share of the room judged it correctly. Aggregates only (see
// lib/hubi-live.ts). Not linked from the nav, not in the sitemap, noindex.
//
//   /hubi-ai/natiijo?since=2026-10-14T17:15:00Z   the room since that instant
//   /hubi-ai/natiijo                              the last 60 minutes
//   /hubi-ai/natiijo?all=1                        all time
//
// The server renders the first frame; HubiLive polls ./data every 5 seconds.

import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { hubiLive, resolveWindow } from '@/lib/hubi-live';
import HubiLiveBoard from '@/components/HubiLive';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Natiijada Hubi AI-ga · Unkad',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ since?: string; all?: string }> };

export default async function HubiLivePage({ searchParams }: Props) {
  const { since, all } = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);

  const initial = await hubiLive(resolveWindow({ since, all }));

  const qs = new URLSearchParams();
  if (all === '1') qs.set('all', '1');
  else if (since) qs.set('since', since);

  return (
    <div className="container live-page">
      {/* VERIFY SOMALI: strings in lib/i18n.ts (hubiLive*) */}
      <HubiLiveBoard
        initial={initial}
        query={qs.toString()}
        labels={{
          title: t('hubiTitle'),
          sub: t('hubiLiveTitle'),
          live: t('hubiLiveLive'),
          players: t('hubiLivePlayers'),
          since: t('hubiLiveSince'),
          allTime: t('hubiLiveAllTime'),
          play: t('hubiLivePlay'),
          aiRight: t('hubiLiveAiRight'),
          aiWrong: t('hubiLiveAiWrong'),
          judged: t('hubiLiveJudged'),
          noAnswers: t('hubiLiveNoAnswers'),
          fooled: t('hubiLiveFooled'),
          few: t('hubiLiveFew'),
          seeAll: t('hubiLiveSeeAll'),
          back: t('hubiLiveBack'),
        }}
      />
    </div>
  );
}
