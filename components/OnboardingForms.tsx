'use client';

import { useActionState, useState } from 'react';
import { saveProfile, giveConsent } from '@/lib/actions';

type Dict = Record<string, string>;

export function ProfileForm({ d }: { d: Dict }) {
  const [error, formAction, pending] = useActionState(saveProfile, null);

  return (
    <form className="form" action={formAction}>
      {error && <p className="notice notice-error">{d[error] ?? error}</p>}

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>
          <label>{d.dialectLabel}</label>
        </legend>
        <div className="choice-list">
          {(['maxaa_tiri', 'maay', 'both', 'other'] as const).map((value) => (
            <label key={value} className="choice">
              <input type="radio" name="dialect" value={value} required />
              <span className="label-text">{d[`dialect_${value}`]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="region">{d.regionLabel}</label>
        <input id="region" name="region" maxLength={80} />
      </div>

      <div>
        <label htmlFor="country">{d.countryLabel}</label>
        <input id="country" name="country" maxLength={60} />
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {d.continue}
      </button>
    </form>
  );
}

export function ConsentForm({ d }: { d: Dict }) {
  const [error, formAction, pending] = useActionState(giveConsent, null);
  const [choice, setChoice] = useState('handle');

  return (
    <form className="form" action={formAction}>
      {error && <p className="notice notice-error">{d[error] ?? error}</p>}

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>
          <label>{d.creditLabel}</label>
        </legend>
        <div className="choice-list">
          {(['handle', 'real_name', 'anonymous'] as const).map((value) => (
            <label key={value} className="choice">
              <input
                type="radio"
                name="creditChoice"
                value={value}
                checked={choice === value}
                onChange={() => setChoice(value)}
              />
              <span className="label-text">{d[`credit_${value}`]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {choice === 'real_name' && (
        <div>
          <label htmlFor="creditName">{d.creditNameLabel}</label>
          <input id="creditName" name="creditName" maxLength={80} required />
        </div>
      )}

      <label className="checkline">
        <input type="checkbox" name="agree" required />
        <span>{d.agreeLabel}</span>
      </label>

      <button className="btn" type="submit" disabled={pending}>
        {d.finish}
      </button>
    </form>
  );
}
