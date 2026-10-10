'use client';

// Event registration (/kulan). Name, email, an optional question. On success
// the action redirects to the thank-you page; on an error it hands the typed
// values back so nothing the person wrote is lost.

import { useActionState } from 'react';
import { registerForEvent, type EventFormState } from '@/lib/actions';

export default function EventRegisterForm({
  slug,
  labels,
}: {
  slug: string;
  labels: {
    name: string;
    email: string;
    question: string;
    submit: string;
    privacy: string;
    errors: Record<string, string>;
  };
}) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(registerForEvent, null);

  return (
    // Keyed on the returned state so the inputs remount with the values the
    // server handed back after an error.
    <form className="form" action={action} key={state ? JSON.stringify(state) : 'blank'}>
      <input type="hidden" name="event" value={slug} />
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {labels.errors[state.error] ?? labels.errors.kulanErrEmail}
        </p>
      )}
      <div>
        <label htmlFor="kulan-name">{labels.name}</label>
        <input
          id="kulan-name"
          name="name"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          defaultValue={state?.name}
        />
      </div>
      <div>
        <label htmlFor="kulan-email">{labels.email}</label>
        <input
          id="kulan-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          defaultValue={state?.email}
        />
      </div>
      <div>
        <label htmlFor="kulan-question">{labels.question}</label>
        <textarea
          id="kulan-question"
          name="question"
          maxLength={500}
          rows={3}
          defaultValue={state?.question}
        />
      </div>
      <button className="btn" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? `${labels.submit}…` : labels.submit}
      </button>
      <p className="hint">{labels.privacy}</p>
    </form>
  );
}
