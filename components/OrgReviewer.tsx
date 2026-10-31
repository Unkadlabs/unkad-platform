'use client';

// One released sentence at a time: Sax, Wax ka beddel, Khalad, or skip.
// The sentences either side are shown faintly, because a sentence whose
// subject was named one line earlier can look wrong on its own.
// !! VERIFY SOMALI !!

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { nextSentence, saveReview, type OrgSentence } from '@/lib/org-review';

type Mode = 'idle' | 'edit' | 'reject';

const ERRORS: Record<string, string> = {
  'ERR:no change': 'Wax isbeddel ah ma jiro. Haddii ay sax tahay, riix «Sax».',
  'ERR:too fast': 'Waxoogaa sug, kadib isku day mar kale.',
  'ERR:too long': 'Qoraalku aad buu u dheer yahay.',
};

export default function OrgReviewer({
  token, sector, sectorName, shortName, initial,
}: {
  token: string;
  sector: string;
  sectorName: string;
  shortName: string;
  initial: OrgSentence | null;
}) {
  const router = useRouter();
  const [cur, setCur] = useState<OrgSentence | null>(initial);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [text, setText] = useState(initial?.text ?? '');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [pending, start] = useTransition();

  const load = async (skip: string[]) => {
    const n = await nextSentence(token, sector, skip);
    setCur(n);
    setText(n?.text ?? '');
    setNote('');
    setMode('idle');
    setErr(null);
    router.refresh(); // keeps the counters at the top honest
  };

  const submit = (verdict: 'approve' | 'edit' | 'reject') =>
    start(async () => {
      if (!cur) return;
      const e = await saveReview(token, cur.id, verdict, verdict === 'edit' ? text : undefined, note);
      if (e) return setErr(ERRORS[e] ?? 'Wax baa khaldamay. Isku day mar kale.');
      setCount((c) => c + 1);
      await load(skipped);
    });

  const skip = () =>
    start(async () => {
      if (!cur) return;
      const s = [...skipped, cur.id];
      setSkipped(s);
      await load(s);
    });

  return (
    <div className="seed-wrap">
      <div className="org-bar">
        <Link href={`/barayaasha/${token}`} className="seed-plain">← Qaybaha</Link>
        <span className="seed-count">{sectorName}{count > 0 && <> · kal-fadhigan: <b>{count}</b></>}</span>
      </div>

      {!cur ? (
        <p className="seed-done">
          Qaybtan wax kale oo la hubiyo kuma harin. Mahadsanid!
        </p>
      ) : (
        <>
          <div className="org-card" lang="so">
            {cur.before && <p className="org-ctx">{cur.before}</p>}
            {mode === 'edit' ? (
              <textarea
                className="seed-ta a org-edit"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.max(3, Math.ceil(text.length / 60))}
                autoFocus
              />
            ) : (
              <p className="org-sentence">{cur.text}</p>
            )}
            {cur.after && <p className="org-ctx">{cur.after}</p>}
          </div>

          {mode === 'reject' && (
            <label className="seed-field">
              <span className="seed-label">MAXAA KHALDAN? <i>(ikhtiyaari)</i></span>
              <textarea className="seed-ta n" rows={2} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            </label>
          )}

          {err && <p className="seed-error">{err}</p>}

          {mode === 'idle' && (
            <div className="org-actions">
              <button className="seed-btn" disabled={pending} onClick={() => submit('approve')}>Sax</button>
              <button className="org-btn" disabled={pending} onClick={() => setMode('edit')}>Wax ka beddel</button>
              <button className="org-btn danger" disabled={pending} onClick={() => setMode('reject')}>Khalad</button>
              <button className="seed-plain" disabled={pending} onClick={skip}>Uma hubo, ka gudub</button>
            </div>
          )}
          {mode === 'edit' && (
            <div className="org-actions">
              <button className="seed-btn" disabled={pending} onClick={() => submit('edit')}>Kaydi saxitaanka</button>
              <button className="seed-plain" disabled={pending} onClick={() => { setMode('idle'); setText(cur.text); setErr(null); }}>Ka noqo</button>
            </div>
          )}
          {mode === 'reject' && (
            <div className="org-actions">
              <button className="org-btn danger solid" disabled={pending} onClick={() => submit('reject')}>Kaydi: khalad</button>
              <button className="seed-plain" disabled={pending} onClick={() => { setMode('idle'); setErr(null); }}>Ka noqo</button>
            </div>
          )}

          <p className="seed-hintline" style={{ marginTop: '1.6rem' }}>
            Go'aan kasta wuxuu raacayaa daabacaadda xigta ee Hugging Face, isagoo wata
            calaamadda «waxaa hubiyay {shortName}».
          </p>
        </>
      )}
    </div>
  );
}
