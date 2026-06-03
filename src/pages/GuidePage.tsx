import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, TAGLINE } from '../constants/brand';
import { useApp } from '../context/AppContext';
import { useProfile } from '../context/ProfileContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import type { GrowthTheme } from '../types';
import './GuidePage.css';

const themeOptions: GrowthTheme[] = [
  'patience', 'self-control', 'faithfulness', 'anxiety', 'prayer',
  'trust', 'leadership', 'family', 'anger', 'gratitude', 'peace',
  'love', 'joy', 'kindness', 'gentleness',
];

export function GuidePage() {
  const { activeProfile } = useProfile();
  const {
    data,
    appMode,
    setTrainingFocus,
    setTrainingVerse,
    archiveTrainingVerse,
    loadDemoData,
    startFreshTrail,
    exportTrailBackup,
    importTrailBackup,
    resetSpiritualAssessment,
    servingDiscovery,
  } = useApp();
  const importInputRef = useRef<HTMLInputElement>(null);

  const [focusTitle, setFocusTitle] = useState('');
  const [focusDesc, setFocusDesc] = useState('');
  const [focusThemes, setFocusThemes] = useState<GrowthTheme[]>(['patience']);

  const [verseRef, setVerseRef] = useState('');
  const [verseText, setVerseText] = useState('');

  const handleFocusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusTitle.trim()) return;
    setTrainingFocus({
      title: focusTitle.trim(),
      description: focusDesc.trim() || `A season of training in ${focusTitle.trim().toLowerCase()}.`,
      themes: focusThemes,
    });
    setFocusTitle('');
    setFocusDesc('');
  };

  const handleVerseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verseRef.trim() || !verseText.trim()) return;
    setTrainingVerse({
      reference: verseRef.trim(),
      text: verseText.trim(),
      linkedFocusId: data.trainingFocus?.id,
      themes: data.trainingFocus?.themes ?? [],
    });
    setVerseRef('');
    setVerseText('');
  };

  const toggleTheme = (t: GrowthTheme) => {
    setFocusThemes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const handleLoadDemo = () => {
    if (window.confirm('Load the demo expedition? Your current journal will be replaced with sample data.')) {
      loadDemoData();
    }
  };

  const handleStartFresh = () => {
    if (window.confirm('Begin a fresh trail? All current journal data will be cleared.')) {
      startFreshTrail();
    }
  };

  return (
    <main className="page-content page-content--form">
      <SubPageHeader
        title="Guide"
        subtitle="Manage your training season and path settings."
      />

      <section className="guide-intro card">
        <p className="guide-intro__text">
          {APP_NAME} is a companion for documenting formation on the path ahead — not measuring
          performance. <span className="serif">{TAGLINE}</span>.
        </p>
      </section>

      {(appMode === 'new' || !data.trainingFocus) && (
        <section className="guide-section guide-section--intake">
          <h2 className="section-title">Begin new trail</h2>
          <p className="guide-section__desc">
            New to {APP_NAME}? Start with the initial spiritual assessment — an intake conversation
            that suggests your first training focus, verse, and reading.
          </p>
          <Link to="/assessment" className="btn btn-primary" style={{ width: '100%' }}>
            Start first training plan
          </Link>
          {data.spiritualAssessment?.status === 'in_progress' && (
            <p className="field-hint" style={{ marginTop: 10, textAlign: 'center' }}>
              You have an intake in progress — resume anytime.
            </p>
          )}
        </section>
      )}

      <section className="guide-section">
        <h2 className="section-title">Set training focus</h2>
        <p className="guide-section__desc">Begin a new season of growth. Your current focus will be archived.</p>
        <form onSubmit={handleFocusSubmit} className="card">
          <div className="field">
            <label className="field-label">Focus area</label>
            <input
              className="text-input"
              value={focusTitle}
              onChange={(e) => setFocusTitle(e.target.value)}
              placeholder="e.g. Patience, Trust, Family"
            />
          </div>
          <div className="field">
            <label className="field-label">Description</label>
            <textarea
              className="text-area"
              value={focusDesc}
              onChange={(e) => setFocusDesc(e.target.value)}
              placeholder="What are you learning in this season?"
              rows={2}
            />
          </div>
          <div className="field">
            <label className="field-label">Themes (for future insights)</label>
            <div className="chip-row">
              {themeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip${focusThemes.includes(t) ? ' chip--active' : ''}`}
                  onClick={() => toggleTheme(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Begin new focus</button>
        </form>
      </section>

      <section className="guide-section">
        <h2 className="section-title">Set training verse</h2>
        <p className="guide-section__desc">One verse to carry through this season. Previous verse will be archived.</p>
        <form onSubmit={handleVerseSubmit} className="card">
          <div className="field">
            <label className="field-label">Reference</label>
            <input
              className="text-input"
              value={verseRef}
              onChange={(e) => setVerseRef(e.target.value)}
              placeholder="James 1:19"
            />
          </div>
          <div className="field">
            <label className="field-label">Verse text</label>
            <textarea
              className="text-area"
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              rows={3}
            />
          </div>
          <button type="submit" className="btn btn-primary">Set training verse</button>
        </form>
        {data.trainingVerse && (
          <button type="button" className="btn btn-secondary" style={{ marginTop: 10, width: '100%' }} onClick={archiveTrainingVerse}>
            Archive current verse
          </button>
        )}
      </section>

      <section className="guide-section">
        <h2 className="section-title">Back up your trail</h2>
        <p className="guide-section__desc">
          Everything lives in this browser until you export. Save a backup file after your assessment
          or anytime your journal grows — you can import it later on this device.
        </p>
        <div className="guide-data-actions card" style={{ padding: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => exportTrailBackup(activeProfile?.name ?? 'trail')}
          >
            Export backup
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => importInputRef.current?.click()}
          >
            Import backup
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importTrailBackup(file);
              e.target.value = '';
            }}
          />
          {data.lastBackupAt && (
            <p className="field-hint" style={{ marginTop: 10, textAlign: 'center' }}>
              Last export: {new Date(data.lastBackupAt).toLocaleString()}
            </p>
          )}
        </div>
      </section>

      <section className="guide-section">
        <h2 className="section-title">Serving discovery</h2>
        <p className="guide-section__desc">
          A separate, practical intake — not a gifts test — about where you help best, what drains you,
          and the kinds of work that fit your personality.
        </p>
        <Link to="/serving" className="btn btn-primary" style={{ width: '100%' }}>
          {servingDiscovery?.status === 'completed'
            ? 'Review serving discovery'
            : servingDiscovery?.status === 'in_progress'
              ? 'Resume serving discovery'
              : 'Start serving discovery'}
        </Link>
      </section>

      <section className="guide-section">
        <h2 className="section-title">Spiritual assessment</h2>
        <p className="guide-section__desc">
          Restart the initial intake if you lost your plan or want a fresh suggestion. Your journal
          entries stay; only the assessment and suggested plan reset.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={() => {
            if (
              window.confirm(
                'Restart the spiritual assessment? Your journal and prayers stay, but you will need to complete intake again.',
              )
            ) {
              resetSpiritualAssessment();
            }
          }}
        >
          Restart spiritual assessment
        </button>
        {data.spiritualAssessment?.status === 'in_progress' && (
          <Link to="/assessment" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }}>
            Resume assessment in progress
          </Link>
        )}
      </section>

      <section className="guide-section">
        <h2 className="section-title">Profile</h2>
        <p className="guide-section__desc">
          Switch between local profiles. Each person&apos;s assessment, training plan, and journal
          stay separate on this device.
        </p>
        <Link to="/profiles" className="btn btn-secondary" style={{ width: '100%' }}>
          Switch profile
        </Link>
      </section>

      <section className="guide-section">
        <h2 className="section-title">Trail modes</h2>
        <p className="guide-section__desc">
          {appMode === 'demo'
            ? 'You are exploring a demo expedition with sample journal entries.'
            : appMode === 'new'
              ? 'Your path is open — ready for your own journey.'
              : 'You are on your personal trail with your own journal.'}
        </p>
        <div className="guide-data-actions">
          <button type="button" className="btn btn-secondary" onClick={handleLoadDemo}>
            Explore demo expedition
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleStartFresh}>
            Begin fresh trail
          </button>
        </div>
        <p className="field-hint" style={{ marginTop: 12, textAlign: 'center' }}>
          All data is stored locally on this device.
        </p>
      </section>
    </main>
  );
}
