'use client';

// The Unkad writer: a focused rich-writing surface for the Qor mode.
//  - light markdown formatting (bold, italic, heading, quote, list)
//  - live preview, word/char counts
//  - drafts autosaved to localStorage per prompt (never lose work on a
//    flaky connection — phone-first)
//  - focus mode: full-screen writing
// The corpus stores the text exactly as written (markdown is plain text),
// so data stays clean while writers get a real editor.

import { useEffect, useRef, useState } from 'react';

type Labels = {
  label: string;
  bold: string;
  italic: string;
  heading: string;
  quote: string;
  list: string;
  preview: string;
  write: string;
  focus: string;
  words: string;
  chars: string;
  draftRestored: string;
};

// Minimal, safe markdown preview: escape HTML first, then apply patterns.
function renderPreview(src: string): string {
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const blocks = escaped.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => l.trim().startsWith('- ') || l.trim() === '')) {
      const items = lines
        .filter((l) => l.trim().startsWith('- '))
        .map((l) => `<li>${l.trim().slice(2)}</li>`)
        .join('');
      if (items) return `<ul>${items}</ul>`;
    }
    if (block.startsWith('## ')) return `<h3>${block.slice(3)}</h3>`;
    if (lines.every((l) => l.startsWith('&gt;') || l.trim() === '')) {
      const inner = lines.map((l) => l.replace(/^&gt;\s?/, '')).join('<br>');
      return `<blockquote>${inner}</blockquote>`;
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  });

  return blocks
    .join('')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

export default function Editor({
  name,
  promptId,
  labels,
  minLength,
}: {
  name: string;
  promptId: string;
  labels: Labels;
  minLength: number;
}) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [focusMode, setFocusMode] = useState(false);
  const [restored, setRestored] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `unkad-draft-${promptId}`;

  // Restore a saved draft for this prompt.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        setValue(saved);
        setRestored(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, [draftKey]);

  // Autosave as the writer types.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (value) localStorage.setItem(draftKey, value);
        else localStorage.removeItem(draftKey);
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [value, draftKey]);

  // Clear the draft when the form actually submits.
  useEffect(() => {
    const area = areaRef.current;
    const form = area?.form;
    if (!form) return;
    const clear = () => {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    };
    form.addEventListener('submit', clear);
    return () => form.removeEventListener('submit', clear);
  }, [draftKey]);

  function wrapSelection(before: string, after: string, blockPrefix?: string) {
    const area = areaRef.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end);

    let next: string;
    let cursor: number;
    if (blockPrefix !== undefined) {
      // Block-level: prefix each selected line (or insert at line start).
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const target = value.slice(lineStart, end) || '';
      const prefixed = (target || ' ')
        .split('\n')
        .map((l) => `${blockPrefix}${l}`)
        .join('\n');
      next = value.slice(0, lineStart) + prefixed + value.slice(end);
      cursor = lineStart + prefixed.length;
    } else {
      next = value.slice(0, start) + before + (selected || '') + after + value.slice(end);
      cursor = selected
        ? start + before.length + selected.length + after.length
        : start + before.length;
    }

    setValue(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(cursor, cursor);
    });
  }

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className={`editor${focusMode ? ' editor-full' : ''}`}>
      {restored && <p className="hint editor-restored">{labels.draftRestored}</p>}

      <div className="editor-bar" role="toolbar" aria-label="Formatting">
        <div className="editor-tools">
          <button type="button" className="tool" title={labels.bold} onClick={() => wrapSelection('**', '**')}>
            <strong>B</strong>
          </button>
          <button type="button" className="tool" title={labels.italic} onClick={() => wrapSelection('_', '_')}>
            <em>I</em>
          </button>
          <button type="button" className="tool" title={labels.heading} onClick={() => wrapSelection('', '', '## ')}>
            H
          </button>
          <button type="button" className="tool" title={labels.quote} onClick={() => wrapSelection('', '', '> ')}>
            &ldquo;
          </button>
          <button type="button" className="tool" title={labels.list} onClick={() => wrapSelection('', '', '- ')}>
            ≡
          </button>
        </div>
        <div className="editor-tools">
          <button
            type="button"
            className={`tool tool-text${mode === 'preview' ? ' is-on' : ''}`}
            onClick={() => setMode(mode === 'write' ? 'preview' : 'write')}
          >
            {mode === 'write' ? labels.preview : labels.write}
          </button>
          <button
            type="button"
            className={`tool tool-text${focusMode ? ' is-on' : ''}`}
            onClick={() => setFocusMode(!focusMode)}
          >
            {labels.focus}
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={areaRef}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          minLength={minLength}
          lang="so"
          dir="ltr"
          aria-label={labels.label}
          className="editor-area"
        />
      ) : (
        <>
          {/* Keep the value in the form while previewing */}
          <textarea name={name} value={value} readOnly hidden />
          <div className="editor-preview" dangerouslySetInnerHTML={{ __html: renderPreview(value) }} />
        </>
      )}

      <div className="editor-status mono tnum">
        {words} {labels.words} · {value.length} {labels.chars}
      </div>
    </div>
  );
}
