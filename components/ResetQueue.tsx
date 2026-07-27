'use client';

// One queued reset request, with the button that fulfils it.
//
// The link is rendered here after the click rather than carried in a redirect,
// so the token stays out of browser history and server logs — same reason as
// the direct issue form.

import { useActionState } from 'react';
import { fulfilResetRequest } from '@/lib/actions';

export default function ResetQueueRow({
  id,
  handle,
  email,
  asked,
}: {
  id: string;
  handle: string;
  email: string;
  asked: string;
}) {
  const [result, action, pending] = useActionState(fulfilResetRequest.bind(null, id), null);
  const ok = result?.startsWith('OK:');
  const link = ok ? result!.slice(result!.indexOf(':', result!.indexOf(':') + 1) + 1) : null;

  return (
    <div className="card">
      <div className="chip-row" style={{ marginBottom: '0.4rem' }}>
        <span className="chip">{handle}</span>
        <span className="chip chip-plain">{email}</span>
        <span className="chip chip-plain">asked {asked}</span>
      </div>

      {!ok ? (
        <form action={action}>
          <button className="btn" type="submit" disabled={pending}>
            Generate link
          </button>
          {result && !ok && (
            <p className="notice notice-error" role="alert">
              {result.replace(/^ERR:/, '')}
            </p>
          )}
        </form>
      ) : (
        <>
          <p
            className="mono"
            style={{ wordBreak: 'break-all', margin: '0.4rem 0', fontSize: '0.78rem' }}
          >
            {link}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Send this to {handle}. Works once, expires in 2 hours, shown only now.
          </p>
        </>
      )}
    </div>
  );
}
