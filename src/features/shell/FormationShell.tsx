import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAME, PathMark, TAGLINE } from '../../brand';
import './FormationShell.css';

const TABS = [
  { to: '/today', label: 'Today', job: 'Train today' },
  { to: '/journey', label: 'Journey', job: 'Where am I going?' },
  { to: '/growth', label: 'Growth', job: 'How am I changing?' },
  { to: '/coach', label: 'Coach', job: 'Guidance' },
] as const;

export function FormationShell() {
  return (
    <div className="formation-shell">
      <aside className="formation-shell__sidebar">
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

        <figure className="formation-shell__quote">
          <p className="path-scripture">
            “But those who wait for Yahweh will renew their strength.”
          </p>
          <p className="path-label">Isaiah 40:31 · WEB</p>
        </figure>

        <div className="formation-shell__profile">
          <div className="formation-shell__avatar" aria-hidden>
            M
          </div>
          <div>
            <p className="formation-shell__profile-name">Preview</p>
            <p className="path-label">Season 01 · Week 1 of 6</p>
            <div className="path-progress__track formation-shell__season-bar" aria-hidden>
              <div className="path-progress__fill" style={{ width: '16%' }} />
            </div>
          </div>
        </div>
      </aside>

      <main className="formation-shell__main">
        <Outlet />
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
