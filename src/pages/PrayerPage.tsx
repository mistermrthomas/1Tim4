import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { formatSince } from '../utils/date';
import type { PrayerRequest, PrayerStatus } from '../types';
import './PrayerPage.css';

const statusLabels: Record<PrayerStatus, string> = {
  active: 'Active',
  partially_answered: 'Partially Answered',
  answered: 'Answered',
};

const statusOrder: PrayerStatus[] = ['active', 'partially_answered', 'answered'];

export function PrayerPage() {
  const { data, addPrayer, updatePrayerStatus, updatePrayerNotes } = useApp();
  const [newPrayer, setNewPrayer] = useState('');
  const [filter, setFilter] = useState<PrayerStatus | 'all'>('all');

  const filtered =
    filter === 'all'
      ? data.prayers
      : data.prayers.filter((p) => p.status === filter);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrayer.trim()) return;
    addPrayer(newPrayer.trim());
    setNewPrayer('');
  };

  return (
    <main className="page-content page-content--form">
      <SubPageHeader
        title="Prayer"
        subtitle="Track the prayers you carry on the trail."
      />

      <form onSubmit={handleAdd} className="prayer-add card">
        <label className="field-label" htmlFor="new-prayer">New prayer request</label>
        <textarea
          id="new-prayer"
          className="text-area"
          value={newPrayer}
          onChange={(e) => setNewPrayer(e.target.value)}
          placeholder="What is on your heart?"
          rows={3}
        />
        <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>
          Add prayer
        </button>
      </form>

      <div className="chip-row" style={{ marginTop: 24 }}>
        <button
          type="button"
          className={`chip${filter === 'all' ? ' chip--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {statusOrder.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${filter === s ? ' chip--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="serif">No prayers here yet.</p>
          <p>Add a request when something is weighing on your heart.</p>
        </div>
      ) : (
        <div className="prayer-list">
          {filtered.map((prayer) => (
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              onStatusChange={updatePrayerStatus}
              onNotesChange={updatePrayerNotes}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function PrayerCard({
  prayer,
  onStatusChange,
  onNotesChange,
}: {
  prayer: PrayerRequest;
  onStatusChange: (id: string, status: PrayerStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(prayer.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <article className={`prayer-card card prayer-card--${prayer.status}`}>
      <div className="prayer-card__head">
        <span className={`prayer-card__status prayer-card__status--${prayer.status}`}>
          {statusLabels[prayer.status]}
        </span>
        <span className="prayer-card__since">Since {formatSince(prayer.createdAt)}</span>
      </div>
      <p className="prayer-card__text">{prayer.text}</p>

      {prayer.notes && !editingNotes && (
        <p className="prayer-card__notes">{prayer.notes}</p>
      )}

      {editingNotes && (
        <textarea
          className="text-area"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ marginTop: 10 }}
        />
      )}

      <div className="prayer-card__actions">
        <select
          className="select-input prayer-card__select"
          value={prayer.status}
          onChange={(e) => onStatusChange(prayer.id, e.target.value as PrayerStatus)}
        >
          {statusOrder.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            if (editingNotes) {
              onNotesChange(prayer.id, notes);
            }
            setEditingNotes(!editingNotes);
          }}
        >
          {editingNotes ? 'Save notes' : 'Add notes'}
        </button>
      </div>
    </article>
  );
}
