import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const navItems = [
  { to: '/', label: 'Trail', icon: 'trail', end: true },
  { to: '/journal', label: 'Journal', icon: 'journal', end: false },
  { to: '/prayer', label: 'Prayer', icon: 'prayer', end: false },
  { to: '/archive', label: 'Archive', icon: 'archive', end: false },
  { to: '/guide', label: 'Guide', icon: 'guide', end: false },
] as const;

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const stroke = active ? '#4a6b50' : '#8a8074';
  switch (icon) {
    case 'trail':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 20l8-16 8 16" />
          {active && <circle cx="12" cy="17" r="1.5" fill="#4a6b50" />}
        </svg>
      );
    case 'journal':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 3h12v18H6z" />
          <path d="M9 8h6M9 12h4M9 16h5" />
        </svg>
      );
    case 'prayer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 4v16M8 8c0-4 4-6 4-10 0 4 4 6 4 10" />
        </svg>
      );
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 19h16M6 16l3-5 3 3 4-7 3 5" />
          <rect x="3" y="4" width="18" height="14" rx="1" />
        </svg>
      );
    case 'guide':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Trail journal navigation">
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <NavIcon icon={icon} active={isActive} />
              <span className="bottom-nav__label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
