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
    default: 'Unkad — Qor Af-Soomaali',
    template: '%s — Unkad',
  },
  description:
    'The Unkad Platform: contribute, translate, and validate Somali text to build an open, quality-controlled Somali corpus.',
  robots: { index: true, follow: true },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const t = makeT(lang);
  const inApp = user && user.consentAt && user.onboardingCompletedAt;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
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
