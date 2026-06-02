import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useProfile } from '../../context/ProfileContext';
import { APP_NAME } from '../../constants/brand';
import { formatLongDate, journeyYear, seasonLabel } from '../../utils/date';
import './PageHeader.css';

export function PageHeader() {
  const { data, appMode } = useApp();
  const { activeProfile } = useProfile();
  const now = new Date();
  const year = journeyYear(data.journeyStartedAt);

  return (
    <header className="page-header">
      <div className="page-header__date-row">
        <h1 className="page-header__title page-header__title--mobile">{APP_NAME}</h1>
        {activeProfile && (
          <Link to="/profiles" className="page-header__profile" title="Switch profile">
            {activeProfile.name}
          </Link>
        )}
        <span className="page-header__date">{formatLongDate(now)}</span>
        <span className="page-header__badge">
          Year {year} · {seasonLabel(now)}
        </span>
        {appMode === 'demo' && <span className="page-header__mode page-header__mode--demo">Demo</span>}
        {appMode === 'new' && <span className="page-header__mode page-header__mode--new">New trail</span>}
      </div>
    </header>
  );
}

export function SubPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { activeProfile } = useProfile();

  return (
    <header className="sub-header">
      <div className="sub-header__meta">
        <div className="eyebrow">Trail Journal</div>
        {activeProfile && (
          <Link to="/profiles" className="page-header__profile" title="Switch profile">
            {activeProfile.name}
          </Link>
        )}
      </div>
      <h1 className="sub-header__title serif">{title}</h1>
      {subtitle && <p className="sub-header__subtitle">{subtitle}</p>}
    </header>
  );
}
