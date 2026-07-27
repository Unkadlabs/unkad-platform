'use client';

// Asks for a reset. The reply is deliberately the same whether or not the
// address is registered, so this form cannot be used to find out who is on the
// platform.

import { useActionState } from 'react';
import { requestPasswordReset } from '@/lib/actions';

export default function ForgotPasswordForm({
  labels,
}: {
  labels: { email: string; submit: string; done: string; error: string };
}) {
  const [result, action, pending] = useActionState(requestPasswordReset, null);

  if (result === 'resetRequested') {
    return (
      <p className="notice rise" lang="so">
        {labels.done}
      </p>
    );
  }

  return (
    <form className="form" action={action}>
      {result && (
        <p className="notice notice-error" role="alert" lang="so">
          {labels.error}
        </p>
      )}
      <div>
        <label htmlFor="email" lang="so">
          {labels.email}
        </label>
        <input id="email" name="email" type="email" required autoFocus />
      </div>
      <button className="btn" type="submit" disabled={pending} lang="so">
        {labels.submit}
      </button>
    </form>
  );
}
