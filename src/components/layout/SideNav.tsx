import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { APP_NAME, TAGLINE } from '../../constants/brand';
import { CompassArt } from '../illustrations/FieldGuideArt';
import './SideNav.css';

const navItems = [
  { to: '/', label: 'Trail', end: true },
  { to: '/journal', label: 'Journal', end: false },
  { to: '/prayer', label: 'Prayer', end: false },
  { to: '/archive', label: 'Archive', end: false },
  { to: '/guide', label: 'Guide', end: false },
] as const;

export function SideNav() {
  const { appMode } = useApp();

  return (
    <aside className="side-nav" aria-label={`${APP_NAME} navigation`}>
      <div className="side-nav__brand">
        <CompassArt className="side-nav__compass" size="md" />
        <p className="side-nav__name serif">{APP_NAME}</p>
        {appMode === 'demo' && (
          <span className="side-nav__mode side-nav__mode--demo">Demo</span>
        )}
        {appMode === 'new' && (
          <span className="side-nav__mode side-nav__mode--new">New trail</span>
        )}
      </div>

      <nav className="side-nav__trail">
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `side-nav__link${isActive ? ' side-nav__link--active' : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="side-nav__tagline serif">{TAGLINE}</p>
    </aside>
  );
}
