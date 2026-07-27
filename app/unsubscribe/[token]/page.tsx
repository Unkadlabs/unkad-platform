// One-click unsubscribe from encouragement mail.
//
// Public and deliberately trivial. Whoever holds the link is trusted, because
// the only thing the link can do is stop that person's mail, which is what the
// holder wanted. Nothing here reveals the address, the handle, or anything else
// about the account.
//
// It acts on load rather than showing a confirm button. Every extra step
// between "I want this to stop" and it stopping is a step where someone gives
// up and presses "report spam" instead, and that costs the sending domain far
// more than the unsubscribe ever would.

import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { unsubscribeByToken, resubscribeByToken } from '@/lib/actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ back?: string }>;
};

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { back } = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);

  // Coming back from the resubscribe action; do not re-unsubscribe them.
  const result = back ? 'resubscribed' : await unsubscribeByToken(token);

  return (
    <div className="container">
      <h1 lang="so">{t('unsubTitle')}</h1>

      {result === 'invalid' ? (
        <p className="notice notice-error" role="alert" lang="so">
          {t('unsubInvalid')}
        </p>
      ) : result === 'resubscribed' ? (
        <p className="notice" lang="so">
          {t('unsubResubscribed')}
        </p>
      ) : (
        <>
          <p lang="so">{result === 'already' ? t('unsubAlready') : t('unsubDone')}</p>

          {/* The way back, offered immediately rather than buried. */}
          <form action={resubscribeByToken.bind(null, token)} style={{ marginTop: '1rem' }}>
            <button className="btn btn-quiet" type="submit" lang="so">
              {t('unsubResubscribe')}
            </button>
          </form>
        </>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/" lang="so">
          qor.unkad.com
        </Link>
      </p>
    </div>
  );
}
