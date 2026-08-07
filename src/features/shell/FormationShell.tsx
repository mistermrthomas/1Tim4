import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAME, PathMark, TAGLINE } from '../../brand';
import { useAuth } from '../../context/AuthContext';
import { hasPendingAccountBagSync } from '../../services/cloudAccountStateSync';
import { hasPendingWeeklyPlanSync } from '../../services/cloudWeeklyPlanSync';
import { PATH_MEDIA } from '../../ui/media';
import { readStoredTheme, storeTheme, type PathTheme } from '../../ui/theme';
import './FormationShell.css';

const TABS = [
  { to: '/today', label: 'Today', job: 'What should I do?' },
  { to: '/training', label: 'Training', job: 'What am I training?' },
  { to: '/progress', label: 'Progress', job: 'Am I improving?' },
] as const;

const MORE_LINKS = [
  { to: '/sermon', label: 'Sunday Sermon' },
  { to: '/training/physical/strength', label: 'Strength log' },
  { to: '/settings', label: 'Settings' },
] as const;

export function FormationShell() {
  const { cloudSyncStatus, user } = useAuth();
  const [theme, setTheme] = useState<PathTheme>(() => readStoredTheme());
  const [pendingCloud, setPendingCloud] = useState(
    () => hasPendingWeeklyPlanSync() || hasPendingAccountBagSync(),
  );
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    const refresh = () =>
      setPendingCloud(hasPendingWeeklyPlanSync() || hasPendingAccountBagSync());
    refresh();
    window.addEventListener('path-weekly-plan-pending', refresh);
    window.addEventListener('path-account-bag-pending', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('path-weekly-plan-pending', refresh);
      window.removeEventListener('path-account-bag-pending', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="formation-shell" data-path-theme={theme}>
      <div className="formation-shell__backdrop" aria-hidden>
        <picture>
          <source
            media="(max-width: 719px)"
            srcSet={PATH_MEDIA.appBackgroundMobile}
            type="image/webp"
          />
          <source
            media="(max-width: 719px)"
            srcSet={PATH_MEDIA.appBackgroundMobileFallback}
          />
          <source srcSet={PATH_MEDIA.appBackground} type="image/webp" />
          <img
            className="formation-shell__backdrop-image"
            src={PATH_MEDIA.appBackgroundFallback}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div className="formation-shell__backdrop-veil" />
      </div>

      <aside className="formation-shell__sidebar">
        <div className="formation-shell__sidebar-top">
          <div className="formation-shell__brand-block">
            <PathMark className="formation-shell__mark" />
            <p className="formation-shell__brand">{APP_NAME}</p>
            <p className="formation-shell__tagline">{TAGLINE}</p>
          </div>

          <nav className="formation-shell__nav" aria-label="Primary">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `formation-shell__tab${isActive ? ' formation-shell__tab--active' : ''}`
                }
                end={tab.to === '/today'}
              >
                <span className="formation-shell__tab-label">{tab.label}</span>
                <span className="formation-shell__tab-job">{tab.job}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="formation-shell__sidebar-bottom">
          <figure className="formation-shell__quote">
            <p className="path-scripture">
              “But those who wait for Yahweh will renew their strength.”
            </p>
            <p className="path-label">Isaiah 40:31 · WEB</p>
          </figure>

          <div className="formation-shell__footer">
            <NavLink to="/sermon" className="formation-shell__manage">
              Sunday Sermon
            </NavLink>
            <NavLink to="/training/physical/strength" className="formation-shell__manage">
              Strength log
            </NavLink>
            <NavLink to="/settings" className="formation-shell__manage">
              Settings
            </NavLink>
            {user && pendingCloud ? (
              <p className="path-label formation-shell__sync-pending">Saving to your account…</p>
            ) : null}
            {user && cloudSyncStatus === 'syncing' ? (
              <p className="path-label formation-shell__sync-pending">Loading account…</p>
            ) : null}

            <button
              type="button"
              className="formation-shell__theme"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span className="formation-shell__theme-icon" aria-hidden>
                {theme === 'dark' ? '☀' : '☾'}
              </span>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <div className="formation-shell__profile">
              <div className="formation-shell__avatar" aria-hidden>
                M
              </div>
              <div>
                <p className="formation-shell__profile-name">Michael</p>
                <p className="path-label">Daily training</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="formation-shell__main">
        <div className="formation-shell__content">
          <div className="formation-shell__mobile-bar">
            <button
              type="button"
              className="formation-shell__theme formation-shell__theme--mobile"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
          <Outlet />
        </div>
      </main>

      {moreOpen ? (
        <div className="formation-shell__more" role="dialog" aria-label="More links">
          <button
            type="button"
            className="formation-shell__more-backdrop"
            aria-label="Close more menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="formation-shell__more-sheet">
            <p className="path-label formation-shell__more-title">More</p>
            <nav className="formation-shell__more-nav" aria-label="Secondary">
              {MORE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="formation-shell__more-link"
                  onClick={() => setMoreOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            {user && pendingCloud ? (
              <p className="path-label formation-shell__sync-pending">Saving to your account…</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav className="formation-shell__mobile-nav" aria-label="Primary mobile">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `formation-shell__mobile-tab${isActive ? ' formation-shell__mobile-tab--active' : ''}`
            }
            end={tab.to === '/today'}
            onClick={() => setMoreOpen(false)}
          >
            {tab.label}
          </NavLink>
        ))}
        <button
          type="button"
          className={`formation-shell__mobile-tab formation-shell__mobile-more${moreOpen ? ' formation-shell__mobile-tab--active' : ''}`}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          More
        </button>
      </nav>
    </div>
  );
}
