'use client';

// Manual light/dark toggle. The system preference is the default; the
// explicit choice is persisted and applied before paint by the inline
// script in the root layout.

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark' || explicit === 'light') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle({ darkLabel, lightLabel }: { darkLabel: string; lightLabel: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable — theme still applies this visit */
    }
    setTheme(next);
  }

  return (
    <button className="header-btn" onClick={toggle} aria-label="Toggle color theme">
      {theme === null ? '…' : theme === 'dark' ? lightLabel : darkLabel}
    </button>
  );
}
