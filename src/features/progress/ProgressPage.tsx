import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recentBodyEntries } from '../../domain/physicalLife/body';
import { mobilityCompletionsInLastDays, readMobilityState } from '../../domain/physicalLife/mobility';
import { recentWalks } from '../../domain/physicalLife/walking';
import {
  bootstrapRotationFromLogs,
  formatDaysSince,
  daysSince,
  getLastSlot,
  getNextSlot,
  readRotationState,
} from '../../domain/strength/rotation';
import {
  activeExercises,
  latestEntry,
  readStrengthState,
} from '../../domain/strength/store';
import { formatRecommendedNext, formatWeight } from '../../domain/strength/progression';
import { recentWorkWeeks } from '../../domain/workTraining/store';
import { listWeeklyPlans } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import '../training/TrainingPage.css';

export function ProgressPage() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const strength = readStrengthState();
  bootstrapRotationFromLogs(strength);
  const rotation = readRotationState();
  const next = getNextSlot(rotation);
  const last = getLastSlot(rotation);
  const exercises = activeExercises(strength).slice(0, 12);
  const body = recentBodyEntries(6);
  const walks = recentWalks(6);
  const mobility = readMobilityState().entries.slice(0, 6);
  const workWeeks = recentWorkWeeks(6);
  const mobilityWeek = mobilityCompletionsInLastDays(7);

  useEffect(() => {
    let cancelled = false;
    listWeeklyPlans()
      .then((list) => {
        if (!cancelled) {
          setPlans(
            list
              .filter((p) => p.status === 'completed' || p.saturdayReflection.completedAt)
              .slice(0, 8),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="training-page path-fade-in">
      <header>
        <p className="path-eyebrow">Am I improving?</p>
        <h1 className="path-display training-page__title">Progress</h1>
        <p className="training-page__lede">
          Useful trends only. No scores, grades, badges, or comparisons.
        </p>
      </header>

      <section className="training-panel path-surface">
        <h2 className="training-panel__title path-display">Spiritual</h2>
        {plans.length === 0 ? (
          <p className="training-meta">Complete a week’s reflection to begin this history.</p>
        ) : (
          <div className="strength-table-wrap">
            <table className="training-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Theme</th>
                  <th>Act of obedience</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      {plan.weekStartDate}
                    </td>
                    <td>{plan.biblical.weeklyTheme || plan.church.sermonTitle || '—'}</td>
                    <td>{plan.biblical.actOfObedience || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link className="path-btn path-btn--ghost" to="/journey">
          Open week history
        </Link>
      </section>

      <section className="training-panel path-surface">
        <h2 className="training-panel__title path-display">Physical</h2>
        <dl className="training-grid training-grid--2">
          <div className="training-stat">
            <dt>Last strength slot</dt>
            <dd>
              {last
                ? `${last.shortLabel} · ${formatDaysSince(daysSince(rotation.lastCompletedDate))}`
                : '—'}
            </dd>
          </div>
          <div className="training-stat">
            <dt>Next</dt>
            <dd>{next.shortLabel}</dd>
          </div>
          <div className="training-stat">
            <dt>Mobility (7 days)</dt>
            <dd>{mobilityWeek}</dd>
          </div>
          <div className="training-stat">
            <dt>Recent walks</dt>
            <dd>{walks.length}</dd>
          </div>
        </dl>

        <p className="today-panel__label">Current working weights</p>
        <div className="strength-table-wrap">
          <table className="training-table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Equip</th>
                <th>Last</th>
                <th>Next</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => {
                const entry = latestEntry(strength, exercise.id);
                return (
                  <tr key={exercise.id}>
                    <td>{exercise.name}</td>
                    <td>{exercise.equipment}</td>
                    <td>
                      {entry ? formatWeight(entry.weightLb, exercise.weightSuffix) : '—'}
                    </td>
                    <td>{formatRecommendedNext(exercise, entry)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="today-panel__label">Body trend</p>
        <div className="strength-table-wrap">
          <table className="training-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th>BF%</th>
                <th>Waist</th>
              </tr>
            </thead>
            <tbody>
              {body.length === 0 ? (
                <tr>
                  <td colSpan={4}>No body metrics yet.</td>
                </tr>
              ) : (
                body.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.weightLb ?? '—'}</td>
                    <td>{row.bodyFatPct ?? '—'}</td>
                    <td>{row.waistIn ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {mobility.length > 0 ? (
          <p className="training-meta">
            Latest mobility: {mobility[0]!.date}
            {mobility[0]!.painNote ? ` · ${mobility[0]!.painNote}` : ''}
          </p>
        ) : null}

        <div className="training-links">
          <Link className="path-btn path-btn--ghost" to="/training?area=physical&section=strength">
            Strength
          </Link>
          <Link className="path-btn path-btn--ghost" to="/workouts">
            Strength log
          </Link>
        </div>
      </section>

      <section className="training-panel path-surface">
        <h2 className="training-panel__title path-display">Work</h2>
        {workWeeks.length === 0 ? (
          <p className="training-meta">Save a work week from Training → Work to begin.</p>
        ) : (
          <div className="strength-table-wrap">
            <table className="training-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Leadership practice</th>
                  <th>Insight</th>
                </tr>
              </thead>
              <tbody>
                {workWeeks.map((week) => (
                  <tr key={week.id}>
                    <td>{week.weekStart}</td>
                    <td>{week.leadershipPractice || '—'}</td>
                    <td>{week.bookInsight || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link className="path-btn path-btn--ghost" to="/training?area=work">
          Open work training
        </Link>
      </section>
    </div>
  );
}
