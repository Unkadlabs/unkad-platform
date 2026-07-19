'use client';

// Application shell for signed-in contributors:
//  - desktop (≥60rem): fixed left sidebar — brand, nav, user block
//  - phone: slim top bar + bottom tab bar (the phone-first surface)

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UnkadMark from './UnkadMark';
import UnugAvatar from './UnugAvatar';
import LangToggle from './LangToggle';
import { logout } from '@/lib/actions';
import type { Lang } from '@/lib/i18n';
import { IconHome, IconPen, IconCheck, IconChart, IconTrophy, IconGear } from './icons';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  tab?: boolean; // include in the mobile tab bar
};

export default function AppShell({
  lang,
  user,
  labels,
  children,
}: {
  lang: Lang;
  user: { id: string; handle: string; reputation: number; role: string };
  labels: Record<string, string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/home', label: labels.home, icon: <IconHome />, tab: true },
    { href: '/contribute', label: labels.contribute, icon: <IconPen />, tab: true },
    { href: '/validate', label: labels.validate, icon: <IconCheck />, tab: true },
    { href: '/dashboard', label: labels.dashboard, icon: <IconChart />, tab: true },
    { href: '/leaderboard', label: labels.leaderboard, icon: <IconTrophy /> },
  ];
  if (user.role === 'admin') {
    items.push({ href: '/admin', label: labels.admin, icon: <IconGear /> });
  }

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="wordmark sidebar-brand" href="/home">
          <UnkadMark size={16} />
          Unkad
        </Link>

        <nav className="sidebar-nav" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`side-link${isCurrent(item.href) ? ' is-current' : ''}`}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
            >
              <span className="side-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-user">
          <Link href="/dashboard" className="user-line">
            <UnugAvatar seed={user.id} size={30} />
            <span className="user-meta">
              <span className="user-name">{user.handle}</span>
              <span className="user-rep tnum">{user.reputation} rep</span>
            </span>
          </Link>
          <div className="sidebar-actions">
            <LangToggle lang={lang} />
            <form action={logout}>
              <button className="header-btn" type="submit">
                {labels.logout}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-top">
          <Link className="wordmark" href="/home">
            <UnkadMark size={15} />
            Unkad
          </Link>
          <div className="mobile-top-actions">
            <LangToggle lang={lang} />
            <form action={logout}>
              <button className="header-btn" type="submit">
                {labels.logout}
              </button>
            </form>
          </div>
        </header>

        <main id="main" className="shell-content">
          {children}
        </main>

        <nav className="tabbar" aria-label="Main">
          {items
            .filter((item) => item.tab)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`tab${isCurrent(item.href) ? ' is-current' : ''}`}
                aria-current={isCurrent(item.href) ? 'page' : undefined}
              >
                <span className="tab-icon">{item.icon}</span>
                <span className="tab-label">{item.label}</span>
              </Link>
            ))}
        </nav>
      </div>
    </div>
  );
}
