'use client';

import { useActionState } from 'react';
import { changePassword } from '@/lib/actions';

type Labels = {
  current: string;
  next: string;
  hint: string;
  submit: string;
  errors: Record<string, string>;
};

export default function ChangePasswordForm({ labels }: { labels: Labels }) {
  const [error, formAction, pending] = useActionState(changePassword, null);

  return (
    <form className="form" action={formAction}>
      {error && <p className="notice notice-error">{labels.errors[error] ?? error}</p>}

      <div>
        <label htmlFor="currentPassword">{labels.current}</label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <div>
        <label htmlFor="newPassword">{labels.next}</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="hint">{labels.hint}</p>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}
