'use client';

// Clears a saved editor draft, and only when a submission actually succeeded.
//
// The success redirect carries the submitted prompt's id, and this runs on the
// page that redirect lands on. Pairing it with the Editor no longer clearing on
// the submit attempt means a contributor's text survives every failure path and
// disappears only once it is safely in the database.

import { useEffect } from 'react';

export default function ClearDraft({ promptId }: { promptId: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(`unkad-draft-${promptId}`);
    } catch {
      /* localStorage may be unavailable; the draft is harmless if it lingers */
    }
  }, [promptId]);

  return null;
}
