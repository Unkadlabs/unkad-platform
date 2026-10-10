// One-click stop for one event's mail. Acts on load, like /unsubscribe: the
// link can only stop that registration's mail, which is what its holder wants.

import Link from 'next/link';
import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { unsubscribeEventByToken } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ t?: string }> };

export default async function KulanUnsubscribePage({ searchParams }: Props) {
  const { t: token } = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);
  const result = await unsubscribeEventByToken(token ?? '');

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <h1 lang={lang}>{t('kulanUnsubTitle')}</h1>
      {result === 'invalid' ? (
        <p className="notice notice-error" role="alert" lang={lang}>
          {t('kulanUnsubInvalid')}
        </p>
      ) : (
        <p lang={lang}>{result === 'already' ? t('kulanUnsubAlready') : t('kulanUnsubDone')}</p>
      )}
      <p className="muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/">&larr; Unkad</Link>
      </p>
    </div>
  );
}
