'use client';

// Sets a new password from a reset link. The token is bound into the action at
// render time rather than sent as a form field, so it cannot be swapped for a
// different one by editing the page.

import { useActionState } from 'react';
import { resetPassword } from '@/lib/actions';

export default function ResetPasswordForm({
  token,
  labels,
}: {
  token: string;
  labels: { newPassword: string; hint: string; submit: string };
}) {
  const [error, action, pending] = useActionState(resetPassword.bind(null, token), null);

  return (
    <form className="form" action={action}>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="password" lang="so">
          {labels.newPassword}
        </label>
        <input id="password" name="password" type="password" required minLength={8} autoFocus />
        <p className="hint" lang="so">
          {labels.hint}
        </p>
      </div>
      <button className="btn" type="submit" disabled={pending} lang="so">
        {labels.submit}
      </button>
    </form>
  );
}
