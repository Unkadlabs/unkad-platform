'use client';

// Issues a password reset link for another account and shows it once, inline.
//
// The link is rendered here rather than carried in a redirect URL, so the token
// never lands in browser history, a referrer header, or a server access log.
// There is no email provider on this platform, so an admin sends it through
// whatever channel they already use with that person.

import { useActionState } from 'react';
import { createPasswordReset } from '@/lib/actions';

export default function IssueResetLink() {
  const [result, action, pending] = useActionState(createPasswordReset, null);

  const ok = result?.startsWith('OK:');
  const handle = ok ? result!.split(':')[1] : null;
  const link = ok ? result!.slice(result!.indexOf(':', result!.indexOf(':') + 1) + 1) : null;

  return (
    <>
      <form className="form" action={action}>
        <div>
          <label htmlFor="resetEmail">Account email</label>
          <input id="resetEmail" name="email" type="email" required />
        </div>
        <button className="btn btn-quiet" type="submit" disabled={pending}>
          Generate reset link
        </button>
      </form>

      {result && !ok && (
        <p className="notice notice-error" role="alert">
          {result.replace(/^ERR:/, '')}
        </p>
      )}

      {ok && (
        <div className="card">
          <span className="eyebrow">Send this to {handle}</span>
          <p
            className="mono"
            style={{ wordBreak: 'break-all', margin: '0.5rem 0', fontSize: '0.8rem' }}
          >
            {link}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Works once, expires in 2 hours, and cancels any earlier link for this account. It is
            shown here only now — generate a new one if you lose it.
          </p>
        </div>
      )}
    </>
  );
}
