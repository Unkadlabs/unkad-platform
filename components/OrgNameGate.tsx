'use client';

// The only thing asked before reviewing: a name. The terms are one line under
// the button, and pressing it is the agreement that makes a correction
// publishable under the dataset's licence. !! VERIFY SOMALI !!

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setReviewerName } from '@/lib/org-review';

export default function OrgNameGate({
  token, orgName, shortName,
}: { token: string; orgName: string; shortName: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      const e = await setReviewerName(token, name);
      if (e) setErr(true);
      else router.refresh();
    });

  return (
    <form className="seed-wrap" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) go(); }}>
      <h1 className="seed-h1">Ku soo dhawoow, {orgName}</h1>
      <p className="seed-lede">
        Hubi jumladaha Af-Soomaaliga ah ee aan ku daabacnay Hugging Face: sax, wax ka beddel, ama khalad.
      </p>

      <label className="seed-field" style={{ marginTop: '1.6rem' }}>
        <span className="seed-label">MAGACAAGA</span>
        <input className="seed-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
      </label>

      {err && <p className="seed-error">Fadlan isku day mar kale.</p>}

      <button className="seed-btn" type="submit" disabled={pending || name.trim().length < 2}>
        Bilow
      </button>

      <p className="seed-hintline" style={{ marginTop: '1.2rem' }}>
        Saxitaanadaada waxaa lagu daabacayaa shatiga CC BY-SA 4.0, iyagoo wata calaamadda
        «waxaa hubiyay {shortName}». Magacaaga dadweynaha uma muuqdo.
      </p>
    </form>
  );
}
