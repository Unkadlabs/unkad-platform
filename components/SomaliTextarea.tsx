'use client';

// Textarea with a live character counter — small feedback that makes
// short micro-tasks feel responsive on a phone.
//
// Also autosaves, when given a `draftKey`. Only `write` mode used the richer
// Editor, which has always saved drafts; translate, transcribe, free write and
// proverbs all used this component and saved nothing, so leaving the page mid
// sentence lost the text outright. A contributor reported losing a translation
// exactly that way. Same storage convention as Editor, so ClearDraft can wipe
// either one.

import { useEffect, useRef, useState } from 'react';
import { keepFieldVisible } from './ViewportFit';

export default function SomaliTextarea({
  name,
  id,
  label,
  charsLabel,
  minLength,
  draftKey,
  draftRestoredLabel,
}: {
  name: string;
  id: string;
  label: string;
  charsLabel: string;
  minLength: number;
  /** Enables autosave. Omit for fields that should never persist. */
  draftKey?: string;
  draftRestoredLabel?: string;
}) {
  const [value, setValue] = useState('');
  const [restored, setRestored] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Restore before the contributor starts typing. Guarded so a browser with
  // storage disabled degrades to the old behaviour rather than breaking the
  // form.
  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        setValue(saved);
        setRestored(true);
        if (ref.current) ref.current.value = saved;
      }
    } catch {
      /* storage unavailable; nothing to restore */
    }
  }, [draftKey]);

  // Debounced so a fast typist on a phone is not writing to storage on every
  // keystroke.
  useEffect(() => {
    if (!draftKey) return;
    const t = setTimeout(() => {
      try {
        if (value) localStorage.setItem(draftKey, value);
        else localStorage.removeItem(draftKey);
      } catch {
        /* storage unavailable; the text is still in the box */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [value, draftKey]);

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea
        ref={ref}
        id={id}
        name={name}
        required
        minLength={minLength}
        lang="so"
        dir="ltr"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setRestored(false);
        }}
        onFocus={(e) => keepFieldVisible(e.currentTarget)}
      />
      <span className="counter" aria-live="polite">
        {value.length} {charsLabel}
        {restored && draftRestoredLabel ? ` · ${draftRestoredLabel}` : ''}
      </span>
    </div>
  );
}
