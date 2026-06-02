import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { formatSince } from '../utils/date';
import type { AppData } from '../types';

export function ArchivePage() {
  const { data, getBooksCompleted, getChapterCount } = useApp();
  const booksCompleted = getBooksCompleted();
  const chapterCount = getChapterCount();
  const answeredCount = data.prayers.filter((p) => p.status === 'answered').length;
  const themes = collectThemes(data);

  return (
    <main className="page-content">
      <SubPageHeader
        title="Archive"
        subtitle="Evidence of how God has been shaping you over time."
      />

      <section className="archive-stats">
        <div className="archive-stat">
          <span className="archive-stat__num serif">{chapterCount}</span>
          <span className="archive-stat__label">Chapters read</span>
        </div>
        <div className="archive-stat">
          <span className="archive-stat__num serif">{booksCompleted.length}</span>
          <span className="archive-stat__label">Books completed</span>
        </div>
        <div className="archive-stat">
          <span className="archive-stat__num serif">{data.lessonsLearned.length}</span>
          <span className="archive-stat__label">Lessons learned</span>
        </div>
        <div className="archive-stat">
          <span className="archive-stat__num serif">{answeredCount}</span>
          <span className="archive-stat__label">Answered prayers</span>
        </div>
      </section>

      {themes.length > 0 && (
        <section className="archive-section">
          <h2 className="section-title">Growth themes</h2>
          <p className="archive-section__desc">Recurring themes in your journal — for future reflection.</p>
          <div className="chip-row">
            {themes.map((t) => (
              <span key={t} className="chip" style={{ cursor: 'default' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            ))}
          </div>
        </section>
      )}

      {booksCompleted.length > 0 && (
        <section className="archive-section">
          <h2 className="section-title">Books completed</h2>
          <ul className="archive-list">
            {booksCompleted.map((book) => (
              <li key={book}>{book}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="archive-section">
        <h2 className="section-title">Training verse archive</h2>
        <p className="archive-section__desc">Verses that carried you through past seasons.</p>
        {data.trainingVerseArchive.length === 0 && !data.trainingVerse ? (
          <p className="archive-empty">No archived verses yet.</p>
        ) : (
          <div className="archive-verses">
            {data.trainingVerse && (
              <div className="archive-verse card archive-verse--active">
                <span className="archive-verse__badge">Current</span>
                <p className="archive-verse__text serif">{data.trainingVerse.text}</p>
                <p className="archive-verse__ref">{data.trainingVerse.reference}</p>
                <p className="archive-verse__dates">Since {formatSince(data.trainingVerse.startedAt)}</p>
              </div>
            )}
            {data.trainingVerseArchive.map((v) => (
              <div key={v.id} className="archive-verse card">
                <p className="archive-verse__text serif">{v.text}</p>
                <p className="archive-verse__ref">{v.reference}</p>
                <p className="archive-verse__dates">
                  {formatSince(v.startedAt)}
                  {v.endedAt ? ` – ${formatSince(v.endedAt)}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="archive-section">
        <h2 className="section-title">Training focus history</h2>
        {data.trainingFocusHistory.length === 0 && !data.trainingFocus ? (
          <p className="archive-empty">No focus history yet.</p>
        ) : (
          <div className="archive-focuses">
            {data.trainingFocus && (
              <div className="archive-focus card">
                <span className="archive-verse__badge">Current</span>
                <p className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{data.trainingFocus.title}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>{data.trainingFocus.description}</p>
              </div>
            )}
            {data.trainingFocusHistory.map((f) => (
              <div key={f.id} className="archive-focus card">
                <p className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{f.title}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                  {formatSince(f.startedAt)}{f.endedAt ? ` – ${formatSince(f.endedAt)}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function collectThemes(data: AppData): string[] {
  const set = new Set<string>();
  for (const l of data.lessonsLearned) {
    for (const t of l.themes) set.add(t);
  }
  if (data.trainingFocus) {
    for (const t of data.trainingFocus.themes) set.add(t);
  }
  for (const f of data.trainingFocusHistory) {
    for (const t of f.themes) set.add(t);
  }
  return Array.from(set).sort();
}
