import { Link } from 'react-router-dom';
import type { JourneyLogItem } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import './JourneyLogPreview.css';

const stageLabels = { prepare: 'Prepare', live: 'Live', reflect: 'Reflect' };

export function JourneyLogPreview({ items }: { items: JourneyLogItem[] }) {
  const preview = items.slice(0, 3);

  return (
    <section className="journey-preview">
      <div className="section-head">
        <h2 className="section-title">Journey log</h2>
        <Link to="/journal" className="section-link">All entries</Link>
      </div>
      {preview.length === 0 ? (
        <p className="journey-preview__empty">Your trail journal is waiting for its first entry.</p>
      ) : (
        <div className="journey-preview__list">
          {preview.map((item) => (
            <article key={item.id} className="journey-preview__entry card">
              <div className="journey-preview__meta">
                <span className="journey-preview__date">{formatDisplayDate(item.date)} · {stageLabels[item.stage]}</span>
                <span className="journey-preview__type">{item.stage === 'prepare' ? 'Morning' : item.stage === 'live' ? 'Midday' : 'Evening'}</span>
              </div>
              <p className="journey-preview__body">{item.preview}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
