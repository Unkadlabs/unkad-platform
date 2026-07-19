import Link from 'next/link';
import UnkadMark from './UnkadMark';
import LangToggle from './LangToggle';
import { logout } from '@/lib/actions';
import { makeT, type Lang } from '@/lib/i18n';
import type { CurrentUser } from '@/lib/auth';

export default function Header({ lang, user }: { lang: Lang; user: CurrentUser | null }) {
  const t = makeT(lang);

  return (
    <header className="site-header">
      <div className="container">
        <Link className="wordmark" href="/">
          <UnkadMark size={15} />
          Unkad
        </Link>
        <nav aria-label="Main">
          <ul className="nav-list">
            {user ? (
              <>
                <li>
                  <Link href="/contribute">{t('navContribute')}</Link>
                </li>
                <li>
                  <Link href="/validate">{t('navValidate')}</Link>
                </li>
                <li>
                  <Link href="/dashboard">{t('navDashboard')}</Link>
                </li>
                <li>
                  <Link href="/leaderboard">{t('navLeaderboard')}</Link>
                </li>
                {user.role === 'admin' && (
                  <li>
                    <Link href="/admin">{t('navAdmin')}</Link>
                  </li>
                )}
                <li>
                  <form action={logout} style={{ display: 'inline' }}>
                    <button className="header-btn" type="submit">
                      {t('logout')}
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/leaderboard">{t('navLeaderboard')}</Link>
                </li>
                <li>
                  <Link href="/login">{t('login')}</Link>
                </li>
                <li>
                  <Link href="/join">{t('join')}</Link>
                </li>
              </>
            )}
            <li>
              <LangToggle lang={lang} />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
