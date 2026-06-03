import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/layout/PageHeader';
import { FocusHero } from '../components/home/FocusHero';
import { TodaysReading } from '../components/home/TodaysReading';
import { TrailStages } from '../components/home/TrailStages';
import { JourneyLogPreview } from '../components/home/JourneyLogPreview';
import { PrayerPreview } from '../components/home/PrayerPreview';
import { LessonsCard } from '../components/home/LessonsCard';
import { HomeOnboarding } from '../components/home/HomeOnboarding';
import { TrailContinueCta } from '../components/home/TrailContinueCta';
import { FirstWeekChecklist } from '../components/home/FirstWeekChecklist';
import { getTodaysTrailStep } from '../utils/todaysTrail';
import './HomePage.css';

export function HomePage() {
  const {
    data,
    todayEntry,
    getJourneyLog,
    isEmpty,
    appMode,
    startFreshTrail,
  } = useApp();

  const focus = data.trainingFocus;
  const verse = data.trainingVerse;
  const logItems = getJourneyLog();
  const todayChapters = todayEntry.prepare?.chaptersRead ?? [];
  const showOnboarding = isEmpty && appMode !== 'demo';
  const trailStep = getTodaysTrailStep(todayEntry);

  return (
    <main className="page-content page-content--home">
      <PageHeader />

      {showOnboarding ? (
        <HomeOnboarding />
      ) : (
        <div className="home-dashboard">
          <FirstWeekChecklist />
          <TrailContinueCta step={trailStep} />
          <section className="home-fold" aria-label="Today on the trail">
            <div className="home-fold__season">
              {focus ? (
                <FocusHero focus={focus} verse={verse} />
              ) : (
                <div className="home-dashboard__placeholder card">
                  <p className="eyebrow">Training focus</p>
                  <p className="serif" style={{ fontSize: 18, marginTop: 8 }}>
                    Set a focus in the Guide to begin your season.
                  </p>
                </div>
              )}
            </div>

            <div className="home-fold__trail">
              <TrailStages entry={todayEntry} compact />
            </div>
          </section>

          <section className="home-dashboard__reading" aria-label="Today's reading">
            <TodaysReading plan={data.readingPlan} todayChapters={todayChapters} />
          </section>

          <aside className="home-dashboard__secondary" aria-label="Journal highlights">
            <p className="home-dashboard__secondary-label eyebrow">From your journal</p>
            <JourneyLogPreview items={logItems} />
            <PrayerPreview prayers={data.prayers} />
            <LessonsCard lessons={data.lessonsLearned} />
          </aside>
        </div>
      )}

      {appMode === 'demo' && !showOnboarding && (
        <p className="home-demo-banner">
          <span className="home-demo-banner__badge">Demo expedition</span>
          Sample journal from a seasoned traveler.{' '}
          <button type="button" className="section-link" onClick={startFreshTrail}>
            Begin your own trail
          </button>
        </p>
      )}
    </main>
  );
}
