import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useProfile } from '../../context/ProfileContext';
import './FirstWeekChecklist.css';

export function FirstWeekChecklist() {
  const { activeProfile } = useProfile();
  const {
    data,
    todayEntry,
    spiritualAssessment,
    servingDiscovery,
    exportTrailBackup,
    markOnboardingItem,
    dismissOnboardingChecklist,
  } = useApp();

  const progress = data.onboardingProgress ?? {};
  if (spiritualAssessment?.status !== 'accepted' || progress.dismissed) {
    return null;
  }

  const hasPrepare = !!todayEntry.prepare;
  const hasLive = !!todayEntry.live;
  const hasReflect = !!todayEntry.reflect;
  const servingDone = servingDiscovery?.status === 'completed';

  const items = [
    {
      id: 'backup',
      label: 'Back up your trail',
      hint: 'Export a file so you never lose your assessment or journal.',
      done: !!progress.backupExported || !!data.lastBackupAt,
      action: 'export' as const,
    },
    {
      id: 'home',
      label: 'Add Path to your home screen',
      hint: 'Safari → Share → Add to Home Screen for quick access.',
      done: !!progress.homeScreenAdded,
      action: 'home' as const,
    },
    {
      id: 'prepare',
      label: 'Complete your first Prepare',
      hint: 'Read, mark your chapter, and note what stood out.',
      done: hasPrepare || Object.values(data.dailyEntries).some((e) => e.prepare),
      action: 'link' as const,
      to: '/prepare',
    },
    {
      id: 'live',
      label: 'Complete your first Live check-in',
      hint: 'Pause midday with your training verse in view.',
      done: hasLive || Object.values(data.dailyEntries).some((e) => e.live),
      action: 'link' as const,
      to: '/live',
    },
    {
      id: 'reflect',
      label: 'Complete your first Reflect',
      hint: 'Review the day and capture what matters.',
      done: hasReflect || Object.values(data.dailyEntries).some((e) => e.reflect),
      action: 'link' as const,
      to: '/reflect',
    },
    {
      id: 'serving',
      label: 'Serving discovery (optional)',
      hint: 'Find where your strengths and personality fit best.',
      done: servingDone,
      action: 'link' as const,
      to: '/serving',
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="first-week card" aria-label="First week on the trail">
      <div className="first-week__head">
        <p className="eyebrow">Your first week</p>
        <p className="first-week__count">
          {doneCount} of {items.length} complete
        </p>
      </div>
      <p className="first-week__lead">
        A short checklist to get oriented. Everything stays on this device until you export a backup.
      </p>
      <ul className="first-week__list">
        {items.map((item) => (
          <li key={item.id} className={`first-week__item${item.done ? ' first-week__item--done' : ''}`}>
            <span className="first-week__check" aria-hidden="true">
              {item.done ? '✓' : '○'}
            </span>
            <div className="first-week__body">
              <p className="first-week__label">{item.label}</p>
              <p className="first-week__hint">{item.hint}</p>
              {!item.done && item.action === 'export' && (
                <button
                  type="button"
                  className="section-link first-week__action"
                  onClick={() => exportTrailBackup(activeProfile?.name ?? 'trail')}
                >
                  Export backup now
                </button>
              )}
              {!item.done && item.action === 'home' && (
                <button
                  type="button"
                  className="section-link first-week__action"
                  onClick={() => markOnboardingItem('homeScreenAdded', true)}
                >
                  I&apos;ve added to home screen
                </button>
              )}
              {!item.done && item.action === 'link' && item.to && (
                <Link to={item.to} className="section-link first-week__action">
                  Go →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {data.lastBackupAt && (
        <p className="first-week__backup-note field-hint">
          Last backup: {new Date(data.lastBackupAt).toLocaleString()}
        </p>
      )}
      <button type="button" className="btn btn-ghost first-week__dismiss" onClick={dismissOnboardingChecklist}>
        Dismiss checklist
      </button>
    </section>
  );
}
