import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppShell from '@/components/AppShell';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://qor.unkad.com'),
  title: {
    // The default title was 'Unkad — Qor Af-Soomaali', which leads with the
    // brand and buries every word anyone actually searches for. A Somali
    // speaker looking for this searches the thing, not the lab.
    default: 'Qor Af-Soomaali — write, translate and validate Somali text',
    template: '%s — Qor Af-Soomaali',
  },
  description:
    'Qor Af-Soomaali is an open Somali corpus written by Somali speakers. Write, translate, transcribe and validate Somali text — every sentence peer-reviewed, openly licensed under CC BY-SA 4.0, and released with named consent. Built by Unkad Labs for AI safety and alignment research in low-resource languages.',
  applicationName: 'Qor Af-Soomaali',
  creator: 'Unkad Labs',
  publisher: 'Unkad Labs',
  alternates: { canonical: '/' },
  keywords: [
    'Qor Af-Soomaali',
    'Somali corpus',
    'Af-Soomaali',
    'qor af soomaali',
    'Somali dataset',
    'open Somali text',
    'Somali NLP',
    'Somali language data',
    'write Somali online',
    'Somali translation',
    'Maahmaahyo',
    'Somali proverbs',
    'Maay',
    'Maxaa-tiri',
    'low-resource languages',
    'AI safety evaluation',
    'AI alignment',
    'CC BY-SA',
    'Unkad Labs',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  // Somali on the share card, because the people being invited are Somali
  // speakers. Kept to one short line: a share card is glanced at, not read, and
  // the long hero subtitle was noise at that size. Verbatim site copy, so no
  // unverified Somali ships. Image comes from app/opengraph-image.tsx.
  openGraph: {
    type: 'website',
    siteName: 'Qor Af-Soomaali',
    url: 'https://qor.unkad.com',
    title: 'Qor Af-Soomaali',
    description:
      'Aynu af-Soomaaliga u qorno da’da AI-ga.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qor Af-Soomaali',
    description:
      'Aynu af-Soomaaliga u qorno da’da AI-ga.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCFBF8' },
    { media: '(prefers-color-scheme: dark)', color: '#141312' },
  ],
};

// Applies a saved theme before first paint to avoid a flash of the wrong theme.
const themeInit = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

// The platform carried no structured data at all, so to a search engine it was
// an unlabelled web app with no stated relationship to the lab, the corpus, or
// the published dataset. Three nodes fix that, linked by @id:
//
//   WebSite      — this host, published by the lab
//   Organization — the same @id the marketing site declares, so the two domains
//                  resolve to one entity instead of competing for the same
//                  Somali-corpus queries
//   Dataset      — the thing being built here, pointed at the Hugging Face
//                  release. This is the node Google Dataset Search reads, and
//                  it is a far less crowded index than web search: a Somali
//                  corpus has almost no competition there.
//
// No address on the Organization, matching the marketing site. Discovery rests
// on language and subject, not on placing anyone.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://qor.unkad.com/#website',
      url: 'https://qor.unkad.com',
      name: 'Qor Af-Soomaali',
      alternateName: 'Unkad Platform',
      description:
        'An open Somali corpus written, translated and peer-validated by Somali speakers.',
      inLanguage: ['so', 'en'],
      publisher: { '@id': 'https://www.unkad.com/#organization' },
    },
    {
      '@type': ['ResearchOrganization', 'NGO'],
      '@id': 'https://www.unkad.com/#organization',
      name: 'Unkad Labs',
      url: 'https://www.unkad.com',
      logo: 'https://www.unkad.com/icon.svg',
      sameAs: [
        'https://github.com/Unkadlabs',
        'https://huggingface.co/unkadlabs',
        'https://x.com/unkadlabs',
      ],
    },
    {
      '@type': 'Dataset',
      '@id': 'https://qor.unkad.com/#dataset',
      name: 'Qor Af-Soomaali — the Unkad Somali Corpus',
      alternateName: 'Unkad Somali Corpus',
      description:
        'Community-contributed Somali text: written, translated and peer-validated by Somali speakers, with a linguist-verified tier. Every item carries provenance — a named author who consented before writing, a licence, a date, a dialect label and a validation record. Built for AI safety evaluation and alignment research in low-resource languages.',
      url: 'https://qor.unkad.com',
      license: 'https://creativecommons.org/licenses/by-sa/4.0/',
      isAccessibleForFree: true,
      inLanguage: ['so', 'en'],
      creator: { '@id': 'https://www.unkad.com/#organization' },
      publisher: { '@id': 'https://www.unkad.com/#organization' },
      distribution: [
        {
          '@type': 'DataDownload',
          encodingFormat: 'application/jsonl',
          contentUrl: 'https://huggingface.co/datasets/unkadlabs/qor-af-soomaali',
        },
      ],
      sameAs: [
        'https://huggingface.co/datasets/unkadlabs/qor-af-soomaali',
        'https://github.com/Unkadlabs/qor-af-soomaali',
      ],
      keywords: [
        'Somali',
        'Af-Soomaali',
        'low-resource language',
        'AI safety evaluation',
        'AI alignment',
        'data provenance',
        'consent-based data collection',
        'community-contributed',
        'sentence segmentation',
      ],
    },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const t = makeT(lang);
  const inApp = user && user.consentAt && user.onboardingCompletedAt;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {inApp ? (
          <AppShell
            lang={lang}
            user={{
              id: user.id,
              handle: user.handle,
              reputation: user.reputation,
              role: user.role,
            }}
            labels={{
              home: t('navHome'),
              contribute: t('navContribute'),
              validate: t('navValidate'),
              dashboard: t('navDashboard'),
              leaderboard: t('navLeaderboard'),
              review: t('navReview'),
              admin: t('navAdmin'),
              logout: t('logout'),
              themeDark: t('themeDark'),
              themeLight: t('themeLight'),
            }}
          >
            {children}
          </AppShell>
        ) : (
          <>
            <Header lang={lang} user={user} />
            <main id="main">{children}</main>
            <Footer />
          </>
        )}
        <Analytics />
      </body>
    </html>
  );
}
