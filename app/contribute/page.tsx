import Link from 'next/link';
import { requireOnboarded } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';

export default async function ContributeHubPage() {
  await requireOnboarded();

  const lang = await getLang();
  const t = makeT(lang);

  const modes = [
    { href: '/contribute/write', name: t('modeWrite'), en: 'Write', desc: t('modeWriteDesc') },
    {
      href: '/contribute/translate',
      name: t('modeTranslate'),
      en: 'Translate',
      desc: t('modeTranslateDesc'),
    },
    {
      href: '/contribute/transcribe',
      name: t('modeTranscribe'),
      en: 'Transcribe',
      desc: t('modeTranscribeDesc'),
    },
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
