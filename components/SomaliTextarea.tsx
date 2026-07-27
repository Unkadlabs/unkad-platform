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
  focusLabel,
  doneLabel,
  sourceText,
  sourceLabel,
  sourceLang,
}: {
  name: string;
  id: string;
  label: string;
  charsLabel: string;
  minLength: number;
  /** Enables autosave. Omit for fields that should never persist. */
  draftKey?: string;
  draftRestoredLabel?: string;
  /** Enables focus mode. Omit and the button is not rendered. */
  focusLabel?: string;
  doneLabel?: string;
  /** Carried into focus mode. Translating with the source hidden is guesswork. */
  sourceText?: string;
  sourceLabel?: string;
  sourceLang?: string;
}) {
  const [value, setValue] = useState('');
  const [restored, setRestored] = useState(false);
  const [full, setFull] = useState(false);
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

  // Focus mode belonged only to `write`, which is the one mode with room to
  // spare. The four modes that use this component are the cramped ones: they
  // carry a sector picker, a prompt card and a source sentence above the box,
  // so on a phone the writing area starts near the fold and the keyboard takes
  // the rest. Full screen is worth more here than it ever was on write.
  //
  // The source sentence comes with it. A translate surface that hides the
  // English while you type the Somali is not a writing surface, it is a memory
  // test, so `sourceText` is pinned above the box rather than left behind on
  // the page.
  return (
    <div className={full ? 'editor editor-full' : 'editor'}>
      <div className="editor-bar">
        <label htmlFor={id} style={{ margin: 0 }}>
          {label}
        </label>
        {focusLabel && (
          <button
            type="button"
            className={`tool tool-text${full ? ' is-on' : ''}`}
            aria-pressed={full}
            onClick={() => {
              setFull(!full);
              // Keep the caret where the writer left it. Toggling a surface
              // that loses your place is worse than not having it.
              requestAnimationFrame(() => ref.current?.focus());
            }}
          >
            {full ? doneLabel ?? focusLabel : focusLabel}
          </button>
        )}
      </div>

      {full && sourceText && (
        <div className="editor-source">
          {sourceLabel && <p className="mono muted editor-source-label">{sourceLabel}</p>}
          <p className="task-text" lang={sourceLang ?? 'en'}>
            {sourceText}
          </p>
        </div>
      )}

      <textarea
        ref={ref}
        id={id}
        name={name}
        required
        minLength={minLength}
        lang="so"
        dir="ltr"
        className="editor-area"
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
