import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getLang } from '@/lib/lang';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Unkad — Qor Af-Soomaali',
    template: '%s — Unkad',
  },
  description:
    'The Unkad Platform: contribute, translate, and validate Somali text to build an open, quality-controlled Somali corpus.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCFBF8' },
    { media: '(prefers-color-scheme: dark)', color: '#141312' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header lang={lang} user={user} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
