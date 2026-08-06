import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadBiblicalDay,
  type ConcreteActionDisposition,
} from '../../domain/biblical/dayLog';
import {
  addDays,
  followingSundayStart,
  isSaturdaySabbath,
  isSundayPlanningDay,
} from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import {
  completeDay,
  evaluateSaturdayEligibility,
  evaluateWeekdayEligibility,
  loadDayCompletion,
  reopenDay,
} from '../../domain/today/dayCompletion';
import {
  greetingForNow,
} from '../../domain/today/formationDay';
import { completeWeeklyPlan, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { SaturdayReflection, WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import { CompleteTodayCard } from './CompleteTodayCard';
import { FormationGuidedDay } from './formation/FormationGuidedDay';
import { FormationPhysicalNext } from './formation/FormationPhysicalNext';
import { TomorrowPreview } from './TomorrowPreview';
import './TodayPage.css';
import './formation/FormationToday.css';

export function TodayActiveWeek({
  weeklyPlan: initial,
  onPlanChange,
}: {
  weeklyPlan: WeeklyPlan;
  onPlanChange: (plan: WeeklyPlan) => void;
}) {
  const [weeklyPlan, setWeeklyPlan] = useState(initial);
  const [completingWeek, setCompletingWeek] = useState(false);
  const [completingDay, setCompletingDay] = useState(false);
  const [dayCompletion, setDayCompletion] = useState(() => loadDayCompletion(todayDateKey()));
  const [progressTick, setProgressTick] = useState(0);
  const [logTick, setLogTick] = useState(0);

  const dateKey = todayDateKey();
  const sabbath = isSaturdaySabbath();
  const sunday = isSundayPlanningDay();
  const theme = weeklyPlan.biblical.weeklyTheme || weeklyPlan.church.sermonTitle || 'This week';

  useEffect(() => {
    setWeeklyPlan(initial);
  }, [initial]);

  useEffect(() => {
    setDayCompletion(loadDayCompletion(dateKey));
    setLogTick((n) => n + 1);
  }, [dateKey]);

  useEffect(() => {
    const id = window.setInterval(() => setProgressTick((n) => n + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  // Re-read bag when formation flow saves (same tab).
  useEffect(() => {
    const onPending = () => setLogTick((n) => n + 1);
    window.addEventListener('path-account-bag-pending', onPending);
    return () => window.removeEventListener('path-account-bag-pending', onPending);
  }, []);

  const weekdayEval = useMemo(() => {
    void progressTick;
    void logTick;
    const log = loadBiblicalDay(dateKey);
    return evaluateWeekdayEligibility(weeklyPlan, dateKey, log);
  }, [progressTick, logTick, weeklyPlan, dateKey]);

  const saturdayEval = useMemo(
    () => evaluateSaturdayEligibility(weeklyPlan.saturdayReflection),
    [weeklyPlan.saturdayReflection],
  );

  const dayClosed = dayCompletion.status === 'completed';

  const handleCompleteWeekday = () => {
    if (!weekdayEval.eligible || dayClosed) return;
    setCompletingDay(true);
    const record = completeDay({
      date: dateKey,
      completionType: 'weekday',
      summary: weekdayEval.summary,
      closureQuality: weekdayEval.closureQuality,
    });
    setDayCompletion(record);
    setCompletingDay(false);
  };

  const handleReopenDay = () => {
    if (!window.confirm('Reopen today? Existing entries are kept so you can correct them.')) return;
    setDayCompletion(reopenDay(dateKey));
  };

  const patchReflection = (patch: Partial<SaturdayReflection>) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      saturdayReflection: { ...prev.saturdayReflection, ...patch },
    }));
  };

  const saveReflection = async () => {
    const saved = await saveWeeklyPlan(weeklyPlan);
    setWeeklyPlan(saved);
    onPlanChange(saved);
  };

  const markWeekComplete = async () => {
    if (!saturdayEval.eligible) return;
    if (!window.confirm('Complete the week? You can begin next Sunday when ready.')) return;
    setCompletingWeek(true);
    try {
      await saveWeeklyPlan(weeklyPlan);
      const done = await completeWeeklyPlan(weeklyPlan.id);
      setWeeklyPlan(done);
      onPlanChange(done);
      setDayCompletion(
        completeDay({
          date: dateKey,
          completionType: 'weekly_reflection',
          summary: {
            biblicalPracticeCompleted: true,
            concreteActionStatus: 'completed' satisfies ConcreteActionDisposition,
            workoutStatus: 'not_scheduled',
            workStatus: 'not_scheduled',
            healthTargetsReached: 0,
            healthTargetsTotal: 0,
            unfinishedItems: [],
          },
          closureQuality: 'completed_as_planned',
        }),
      );
    } finally {
      setCompletingWeek(false);
    }
  };

  if (sunday) {
    return (
      <div className="today-preview path-fade-in formation-flow formation-flow--quiet">
        <header className="formation-hero formation-hero--quiet">
          <p className="formation-hero__greeting">{greetingForNow()}</p>
          <h1 className="formation-hero__title">Rest today</h1>
          <p className="formation-hero__soft">
            {weeklyPlan.church.sermonTitle || theme}. Formation continues Monday.
          </p>
        </header>
        <section className="formation-stage">
          <p className="formation-stage__label">Sunday</p>
          <p className="formation-stage__hint">
            Worship and rest. Keep the week’s sermon close. Return tomorrow to read and observe.
          </p>
          <Link className="formation-text-btn" to="/sermon">
            Update sermon notes
          </Link>
        </section>
        <FormationPhysicalNext />
      </div>
    );
  }

  if (sabbath) {
    return (
      <div className="today-preview path-fade-in formation-flow formation-flow--quiet">
        <header className="formation-hero formation-hero--quiet">
          <p className="formation-hero__greeting">{greetingForNow()}</p>
          <h1 className="formation-hero__title">Sabbath reflection</h1>
          <p className="formation-hero__soft">{theme}</p>
        </header>

        <section className="formation-stage">
          <p className="formation-stage__label">Reflect</p>
          <p className="formation-stage__hint">
            Rest from structured training. Be present. Then tell the truth about the week.
          </p>
          <div className="formation-evening__fields">
            {(
              [
                ['godShowed', 'What did God show me this week?'],
                [
                  'practicedNotJustRemembered',
                  'Where did I practice the sermon rather than merely remember it?',
                ],
                ['resistedOrDrifted', 'Where did I resist or drift?'],
                ['trainingChanged', 'What changed in my training?'],
                ['workMoved', 'What meaningful work moved forward?'],
                ['carryForward', 'What should carry into next week?'],
                ['release', 'What should be released rather than carried forward?'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="path-field formation-journal">
                <span>{label}</span>
                <textarea
                  rows={3}
                  value={weeklyPlan.saturdayReflection[key]}
                  onChange={(e) => patchReflection({ [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="path-field">
              <span>Did I complete my act of obedience?</span>
              <select
                value={weeklyPlan.saturdayReflection.actOfObedienceDone}
                onChange={(e) =>
                  patchReflection({
                    actOfObedienceDone: e.target.value as SaturdayReflection['actOfObedienceDone'],
                  })
                }
              >
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="partial">Partially</option>
                <option value="no">Not yet</option>
              </select>
            </label>
          </div>
          <Button variant="ghost" onClick={() => void saveReflection()}>
            Save reflection
          </Button>
        </section>

        <CompleteTodayCard
          variant="weekly_reflection"
          eligible={saturdayEval.eligible || weeklyPlan.status === 'completed'}
          missing={saturdayEval.missing}
          completed={dayClosed || weeklyPlan.status === 'completed'}
          record={dayCompletion}
          summary={dayCompletion.summary}
          closureQuality={dayCompletion.closureQuality}
          completing={completingWeek}
          onComplete={() => void markWeekComplete()}
          onReopen={dayClosed ? handleReopenDay : undefined}
        />

        {(dayClosed || weeklyPlan.status === 'completed') && (
          <TomorrowPreview
            plan={weeklyPlan}
            targetDate={followingSundayStart()}
            showPrepare={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="today-preview path-fade-in">
      <FormationGuidedDay weeklyPlan={weeklyPlan} dateKey={dateKey} dayClosed={dayClosed} />

      <div className="formation-complete">
        <CompleteTodayCard
          variant="weekday"
          eligible={weekdayEval.eligible}
          missing={weekdayEval.missing}
          completed={dayClosed}
          record={dayCompletion}
          summary={dayClosed ? dayCompletion.summary : weekdayEval.summary}
          closureQuality={dayClosed ? dayCompletion.closureQuality : weekdayEval.closureQuality}
          completing={completingDay}
          onComplete={handleCompleteWeekday}
          onReopen={dayClosed ? handleReopenDay : undefined}
        />

        {dayClosed ? (
          <>
            <p className="complete-today__next-note">
              Tomorrow is ready. Prepare what you need, then close Path for the night.
            </p>
            <TomorrowPreview plan={weeklyPlan} targetDate={addDays(dateKey, 1)} showPrepare />
          </>
        ) : null}
      </div>
    </div>
  );
}
