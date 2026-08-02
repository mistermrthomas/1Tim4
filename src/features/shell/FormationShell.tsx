import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAME, PathMark, TAGLINE } from '../../brand';
import { PATH_MEDIA } from '../../ui/media';
import { readStoredTheme, storeTheme, type PathTheme } from '../../ui/theme';
import './FormationShell.css';

const TABS = [
  { to: '/today', label: 'Today', job: 'Train today' },
  { to: '/journey', label: 'Journey', job: 'This week & history' },
  { to: '/growth', label: 'Growth', job: 'Weekly reflections' },
  { to: '/coach', label: 'Coach', job: 'Guidance & adjustments' },
] as const;

export function FormationShell() {
  const [theme, setTheme] = useState<PathTheme>(() => readStoredTheme());

  useEffect(() => {
    storeTheme(theme);
  }, [theme]);

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
            <NavLink to="/plan/week" className="formation-shell__manage">
              Weekly plan
            </NavLink>
            <NavLink to="/settings" className="formation-shell__manage">
              Settings
            </NavLink>
            <NavLink to="/workouts" className="formation-shell__manage">
              Workouts
            </NavLink>

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
                <p className="path-label">Weekly planning</p>
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

      <nav className="formation-shell__mobile-nav" aria-label="Primary mobile">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `formation-shell__mobile-tab${isActive ? ' formation-shell__mobile-tab--active' : ''}`
            }
            end={tab.to === '/today'}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
