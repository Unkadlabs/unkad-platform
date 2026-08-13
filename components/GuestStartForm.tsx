'use client';

// Visitor-mode entry: one consent tick, an optional dialect, start.
// Deliberately the smallest form on the platform; the barrier this
// removes is the signup form itself.

import { useActionState } from 'react';
import { startGuestSession } from '@/lib/actions';

type Labels = {
  consent: string;
  dialect: string;
  start: string;
  errors: Record<string, string>;
};

export default function GuestStartForm({ labels }: { labels: Labels }) {
  const [error, formAction, pending] = useActionState(startGuestSession, null);

  return (
    <form className="form" action={formAction}>
      {error && <p className="notice notice-error">{labels.errors[error] ?? error}</p>}

      {/* Honeypot, same as the signup form. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: 'absolute', left: '-9999px' }}
        aria-hidden="true"
      />

      <div>
        <label htmlFor="guestDialect">{labels.dialect}</label>
        <select id="guestDialect" name="dialect" defaultValue="">
          <option value="">—</option>
          <option value="maxaa_tiri">Maxaa tiri</option>
          <option value="maay">Maay</option>
          <option value="both">Labada</option>
          <option value="other">Kale</option>
        </select>
      </div>

      <div className="goal-notify">
        <label htmlFor="guestConsent" className="goal-notify-label">
          <input id="guestConsent" name="consent" type="checkbox" required />
          <span>{labels.consent}</span>
        </label>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {labels.start}
      </button>
    </form>
  );
}
