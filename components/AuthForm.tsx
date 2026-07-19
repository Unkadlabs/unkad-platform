'use client';

import { useActionState } from 'react';
import { signup, login } from '@/lib/actions';

type Labels = {
  email: string;
  password: string;
  handle: string;
  handleHint: string;
  submit: string;
  license: string;
  errors: Record<string, string>;
};

export default function AuthForm({ kind, labels }: { kind: 'signup' | 'login'; labels: Labels }) {
  const action = kind === 'signup' ? signup : login;
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form className="form" action={formAction}>
      {error && <p className="notice notice-error">{labels.errors[error] ?? error}</p>}

      {kind === 'signup' && (
        <div>
          <label htmlFor="handle">{labels.handle}</label>
          <input id="handle" name="handle" required maxLength={40} autoComplete="nickname" />
          <p className="hint">{labels.handleHint}</p>
        </div>
      )}

      <div>
        <label htmlFor="email">{labels.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div>
        <label htmlFor="password">{labels.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={kind === 'signup' ? 'new-password' : 'current-password'}
        />
      </div>

      {kind === 'signup' && <p className="hint">{labels.license}</p>}

      <button className="btn" type="submit" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}
