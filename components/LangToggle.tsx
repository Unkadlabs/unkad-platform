'use client';

// Somali is the default; the toggle switches to English and back.
// The choice lives in a cookie so server components can read it.

import { LANG_COOKIE, type Lang } from '@/lib/i18n';

export default function LangToggle({ lang }: { lang: Lang }) {
  const next: Lang = lang === 'so' ? 'en' : 'so';

  function switchLang() {
    document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    window.location.reload();
  }

  return (
    <button className="lang-toggle" onClick={switchLang} aria-label="Switch language">
      {next === 'en' ? 'English' : 'Soomaali'}
    </button>
  );
}
