import { Link } from 'react-router-dom';
import type { PrayerRequest } from '../../types';
import { formatSince } from '../../utils/date';
import './PrayerPreview.css';

export function PrayerPreview({ prayers }: { prayers: PrayerRequest[] }) {
  const active = prayers.filter((p) => p.status === 'active' || p.status === 'partially_answered').slice(0, 3);

  return (
    <section className="prayer-preview">
      <div className="section-head">
        <h2 className="section-title">Active prayers</h2>
        <Link to="/prayer" className="section-link">View all</Link>
      </div>
      {active.length === 0 ? (
        <p className="prayer-preview__empty">No active prayers — add one when something is on your heart.</p>
      ) : (
        <div className="prayer-preview__list">
          {active.map((prayer) => (
            <div key={prayer.id} className="prayer-preview__item">
              <div className="prayer-preview__mark" />
              <p className="prayer-preview__text">{prayer.text}</p>
              <span className="prayer-preview__since">Since {formatSince(prayer.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
