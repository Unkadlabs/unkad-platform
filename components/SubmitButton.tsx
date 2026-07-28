'use client';

// Submit button that locks while the action is in flight.
//
// The thirteen-duplicates incident: on a slow phone connection the redirect
// after submit can take seconds, the page shows nothing in the meantime, and
// every extra tap posts the whole form again. The server now refuses the
// duplicates, but the person still deserves to see that their tap worked.
// Disabling on pending closes the tap-again window and the ellipsis is the
// feedback; no new Somali strings needed.

import { useFormStatus } from 'react-dom';

export default function SubmitButton({
  label,
  className = 'btn',
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? `${label}…` : label}
    </button>
  );
}
