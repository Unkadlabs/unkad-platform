'use client';

// Textarea with a live character counter — small feedback that makes
// short micro-tasks feel responsive on a phone.

import { useState } from 'react';

export default function SomaliTextarea({
  name,
  id,
  label,
  charsLabel,
  minLength,
}: {
  name: string;
  id: string;
  label: string;
  charsLabel: string;
  minLength: number;
}) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={name}
        required
        minLength={minLength}
        lang="so"
        dir="ltr"
        onChange={(e) => setCount(e.target.value.length)}
      />
      <span className="counter" aria-live="polite">
        {count} {charsLabel}
      </span>
    </div>
  );
}
