'use client';

// The weekly goal form with a live share-of-the-campaign preview.
// The preview recomputes as the write number changes, so the "why"
// of the goal is visible before the save button is pressed.

import { useActionState, useState } from 'react';
import { setGoal } from '@/lib/actions';

type Labels = {
  write: string;
  validate: string;
  notify: string;
  notifyHint: string;
  save: string;
  clearHint: string;
  shareOf: string;
  pace: string;
};

export default function GoalForm({
  initialWrite,
  initialValidate,
  initialNotify,
  hasEmail,
  remaining,
  labels,
}: {
  initialWrite: number;
  initialValidate: number;
  initialNotify: boolean;
  hasEmail: boolean;
  remaining: number;
  labels: Labels;
}) {
  const [error, formAction, pending] = useActionState(setGoal, null);
  const [write, setWrite] = useState(initialWrite);

  const share = remaining > 0 ? (write / remaining) * 100 : 0;

  return (
    <form className="form" action={formAction}>
      {error && <p className="notice notice-error">{error.replace(/^ERR:/, '')}</p>}

      <div>
        <label htmlFor="weeklyWrite">{labels.write}</label>
        <input
          id="weeklyWrite"
          name="weeklyWrite"
          type="number"
          min={0}
          max={500}
          value={write}
          onChange={(e) => setWrite(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
          inputMode="numeric"
        />
      </div>

      <div>
        <label htmlFor="weeklyValidate">{labels.validate}</label>
        <input
          id="weeklyValidate"
          name="weeklyValidate"
          type="number"
          min={0}
          max={1000}
          defaultValue={initialValidate}
          inputMode="numeric"
        />
        <p className="hint">{labels.clearHint}</p>
      </div>

      {hasEmail ? (
        <div className="goal-notify">
          <label htmlFor="goalNotify" className="goal-notify-label">
            <input id="goalNotify" name="notify" type="checkbox" defaultChecked={initialNotify} />
            <span>{labels.notify}</span>
          </label>
          <p className="hint">{labels.notifyHint}</p>
        </div>
      ) : (
        <p className="hint">{labels.notifyHint}</p>
      )}

      <div className="goal-preview mono tnum">
        <p>
          {share.toFixed(3)}% &middot; {labels.shareOf}
        </p>
        <p>
          {(write * 12).toLocaleString()} &middot; {labels.pace}
        </p>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {labels.save}
      </button>
    </form>
  );
}
