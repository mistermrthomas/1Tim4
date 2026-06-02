import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { formatDisplayDate } from '../utils/date';
import type { GrowthTheme, JourneyStage } from '../types';

const stageLabels: Record<JourneyStage, string> = {
  prepare: 'Prepare',
  live: 'Live',
  reflect: 'Reflect',
};

const stageTime: Record<JourneyStage, string> = {
  prepare: 'Morning',
  live: 'Midday',
  reflect: 'Evening',
};

const themes: GrowthTheme[] = [
  'patience', 'self-control', 'faithfulness', 'anxiety', 'prayer',
  'trust', 'leadership', 'family', 'anger', 'gratitude', 'peace',
];

export function JourneyLogPage() {
  const { getJourneyLog, data } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [book, setBook] = useState('');
  const [theme, setTheme] = useState<GrowthTheme | ''>('');
  const [focusId, setFocusId] = useState('');

  const books = useMemo(() => {
    const set = new Set<string>();
    for (const entry of Object.values(data.dailyEntries)) {
      for (const ch of entry.prepare?.chaptersRead ?? []) {
        set.add(ch.book);
      }
    }
    return Array.from(set).sort();
  }, [data.dailyEntries]);

  const focusOptions = useMemo(() => {
    const opts: { id: string; title: string }[] = [];
    if (data.trainingFocus) opts.push(data.trainingFocus);
    opts.push(...data.trainingFocusHistory);
    return opts;
  }, [data.trainingFocus, data.trainingFocusHistory]);

  const items = getJourneyLog({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    book: book || undefined,
    theme: theme || undefined,
    focusId: focusId || undefined,
  });

  return (
    <main className="page-content">
      <SubPageHeader
        title="Journey Log"
        subtitle="A chronological record of your trail."
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Filter entries</div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field-label">From date</label>
          <input type="date" className="text-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field-label">To date</label>
          <input type="date" className="text-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field-label">Bible book</label>
          <select className="select-input" value={book} onChange={(e) => setBook(e.target.value)}>
            <option value="">All books</option>
            {books.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field-label">Training focus</label>
          <select className="select-input" value={focusId} onChange={(e) => setFocusId(e.target.value)}>
            <option value="">All focuses</option>
            {focusOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label">Growth theme</label>
          <select className="select-input" value={theme} onChange={(e) => setTheme(e.target.value as GrowthTheme | '')}>
            <option value="">All themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p className="serif">No entries match your filters.</p>
          <p>Adjust filters or begin today&apos;s trail.</p>
        </div>
      ) : (
        <div className="journal-list">
          {items.map((item) => (
            <article key={item.id} className="journal-entry card">
              <header className="journal-entry__head">
                <time className="journal-entry__date">{formatDisplayDate(item.date)}</time>
                <span className="journal-entry__stage">{stageLabels[item.stage]} · {stageTime[item.stage]}</span>
              </header>
              {item.focusTitle && (
                <p className="journal-entry__focus">Focus: {item.focusTitle}</p>
              )}
              {item.book && (
                <p className="journal-entry__book">Reading: {item.book}</p>
              )}
              <p className="journal-entry__body">{item.preview}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
