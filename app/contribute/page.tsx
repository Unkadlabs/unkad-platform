import Link from 'next/link';
import { and, count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { prompts } from '@/lib/schema';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

export default async function ContributeHubPage() {
  await requireOnboarded();

  const lang = await getLang();
  const t = makeT(lang);

  // A mode with no active prompts is a dead end — the card would lead
  // straight to "no tasks". Transcribe in particular needs a registered
  // public-domain source before it has anything to offer, so it appears
  // only once prompts exist for it.
  const [transcribable] = await db
    .select({ n: count() })
    .from(prompts)
    .where(and(eq(prompts.mode, 'transcribe'), eq(prompts.active, true)));

  const modes = [
    { href: '/contribute/write', name: t('modeWrite'), en: 'Write', desc: t('modeWriteDesc') },
    {
      href: '/contribute/translate',
      name: t('modeTranslate'),
      en: 'Translate',
      desc: t('modeTranslateDesc'),
    },
    ...(transcribable.n > 0
      ? [
          {
            href: '/contribute/transcribe',
            name: t('modeTranscribe'),
            en: 'Transcribe',
            desc: t('modeTranscribeDesc'),
          },
        ]
      : []),
    { href: '/contribute/proverb', name: t('modeProverb'), en: 'Proverb', desc: t('modeProverbDesc') },
    { href: '/validate', name: t('modeValidate'), en: 'Validate', desc: t('modeValidateDesc') },
  ];

  return (
    <div className="container">
      <h1>{t('navContribute')}</h1>
      <div className="mode-grid">
        {modes.map((mode) => (
          <Link key={mode.href} className="mode-card" href={mode.href}>
            <span className="mode-name">
              <span className="so" lang="so">
                {mode.name}
              </span>
              {lang === 'so' ? '' : ` · ${mode.en}`}
            </span>
            <p>{mode.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
