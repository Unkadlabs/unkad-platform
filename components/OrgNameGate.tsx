'use client';

// The only thing asked before reviewing: a name, and agreement to the terms
// that make a correction publishable. !! VERIFY SOMALI !!

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setReviewerName } from '@/lib/org-review';

export default function OrgNameGate({
  token, orgName, shortName,
}: { token: string; orgName: string; shortName: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="seed-wrap">
      <h1 className="seed-h1">Ku soo dhawoow, {orgName}</h1>
      <p className="seed-lede">
        Halkan waxaad ku hubin kartaan jumladaha Af-Soomaaliga ah ee Unkad Labs ku daabacday
        Hugging Face. Jumlad kasta waxaad ka dhihi kartaa: sax, wax ka beddel, ama khalad.
      </p>

      <h2 className="seed-h2">Shuruudaha</h2>
      <ul className="seed-terms">
        <li>Jumladahan waxaa qoray dad Soomaaliyeed oo ku qoray Qor (qor.unkad.com), horayna waa loo daabacay.</li>
        <li>Go'aankaagu wuxuu raacayaa daabacaadda xigta, isagoo wata calaamadda «waxaa hubiyay {shortName}».</li>
        <li>Wixii aad saxdo waxaa lagu daabacayaa shatiga CC BY-SA 4.0. Qoraalka asalka ah wuu kaydsanaanayaa.</li>
        <li>Magacaaga waxaan u isticmaalnaa oo keliya inaan ogaano cidda hubisay. Dadweynaha waxaa u muuqda magaca ururka.</li>
      </ul>

      <label className="seed-field" style={{ marginTop: '1.6rem' }}>
        <span className="seed-label">MAGACAAGA</span>
        <input className="seed-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </label>

      <label className="seed-agree">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>Waan akhriyay, waanan aqbalay.</span>
      </label>

      {err && <p className="seed-error">Fadlan isku day mar kale.</p>}

      <button
        className="seed-btn"
        disabled={!agreed || pending || name.trim().length < 2}
        onClick={() =>
          start(async () => {
            const e = await setReviewerName(token, name);
            if (e) setErr(e);
            else router.refresh();
          })
        }
      >
        Bilow
      </button>
    </div>
  );
}
