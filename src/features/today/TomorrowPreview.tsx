import { useState } from 'react';
import { Link } from 'react-router-dom';
import { shortWeekdayLabel, type DateKey } from '../../domain/calendar/week';
import { normalizePhysicalDay } from '../../domain/weeklyPlan/physicalWorkouts';
import {
  emptyTomorrowReadiness,
  markReadyForTomorrow,
  readTomorrowReadiness,
  writeTomorrowReadiness,
  type TomorrowReadiness,
} from '../../domain/weeklyPlan/tomorrowReadiness';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';

function formatLongDate(dateKey: DateKey): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function buildTomorrowPreviewModel(
  plan: WeeklyPlan | null,
  targetDate: DateKey,
): {
  title: string;
  subtitle: string;
  read: string | null;
  focus: string | null;
  practice: string | null;
  training: string | null;
  trainingMissing: string | null;
  work: string | null;
  workMissing: string | null;
  isSundayPlanning: boolean;
} {
  if (!plan) {
    return {
      title: 'Tomorrow',
      subtitle: formatLongDate(targetDate),
      read: null,
      focus: null,
      practice: null,
      training: null,
      trainingMissing: 'Activate a weekly plan to preview tomorrow.',
      work: null,
      workMissing: null,
      isSundayPlanning: false,
    };
  }

  const biblical = plan.biblical.days.find((d) => d.date === targetDate);
  const physical = plan.physical.days.find((d) => d.date === targetDate);
  const workDays = plan.work.days.filter(
    (d) => d.date === targetDate && d.status !== 'removed' && d.title.trim(),
  );

  const [y, m, d] = targetDate.split('-').map(Number);
  const targetIsSunday = new Date(y!, m! - 1, d!, 12).getDay() === 0;

  // Sunday planning day preview (this week’s Sunday or next week’s)
  if (targetIsSunday || biblical?.dayNumber === 1 || physical?.dayNumber === 1) {
    return {
      title: 'Tomorrow — Sunday',
      subtitle: 'Weekly planning day',
      read: null,
      focus: 'Capture the sermon and build next week’s plan.',
      practice: 'Set aside time for Sunday planning.',
      training: null,
      trainingMissing: null,
      work: null,
      workMissing: null,
      isSundayPlanning: true,
    };
  }

  const blocks = physical ? normalizePhysicalDay(physical).scheduledWorkouts : [];
  const trainingLabel =
    blocks.length > 0
      ? blocks.map((b) => b.workoutName || 'Workout').join(' · ')
      : physical?.type === 'rest'
        ? 'Rest day'
        : physical?.type === 'recovery'
          ? physical.workoutName || 'Recovery'
          : null;

  const read =
    biblical?.scripture.trim() ||
    plan.biblical.coreScripture.trim() ||
    plan.church.primaryScripture.trim() ||
    null;
  const focus = biblical?.focus.trim() || biblical?.title.trim() || null;
  const practice =
    biblical?.practice.trim() || plan.biblical.weeklyPractice.trim() || null;
  const work = workDays[0]?.title.trim() || null;

  const weekday = biblical?.dayNumber
    ? shortWeekdayLabel(biblical.dayNumber)
    : formatLongDate(targetDate);

  return {
    title: `Tomorrow — ${weekday}`,
    subtitle: formatLongDate(targetDate),
    read,
    focus,
    practice,
    training: trainingLabel,
    trainingMissing:
      trainingLabel || physical?.type === 'rest'
        ? null
        : 'Complete the training plan to preview tomorrow’s workout.',
    work,
    workMissing: work ? null : 'Complete the work plan to preview tomorrow’s priority.',
    isSundayPlanning: false,
  };
}

export function TomorrowPreview({
  plan,
  targetDate,
  compact = false,
  showPrepare = true,
  planLink,
}: {
  plan: WeeklyPlan | null;
  targetDate: DateKey;
  compact?: boolean;
  showPrepare?: boolean;
  planLink?: string;
}) {
  const model = buildTomorrowPreviewModel(plan, targetDate);
  const [readiness, setReadiness] = useState<TomorrowReadiness>(() =>
    readTomorrowReadiness(targetDate),
  );
  const [showChecklist, setShowChecklist] = useState(false);

  const patchReady = (patch: Partial<TomorrowReadiness>) => {
    const next = writeTomorrowReadiness({ ...readiness, ...patch, targetDate });
    setReadiness(next);
  };

  return (
    <section className={`tomorrow-preview path-surface${compact ? ' tomorrow-preview--compact' : ''}`}>
      <p className="today-panel__label">{model.title}</p>
      <p className="tomorrow-preview__subtitle">{model.subtitle}</p>

      {model.isSundayPlanning ? (
        <ul className="tomorrow-preview__list">
          <li>
            <strong>Focus</strong>
            <span>{model.focus}</span>
          </li>
          <li>
            <strong>Practice</strong>
            <span>{model.practice}</span>
          </li>
        </ul>
      ) : (
        <ul className="tomorrow-preview__list">
          <li>
            <strong>Read</strong>
            <span>{model.read || '—'}</span>
          </li>
          <li>
            <strong>Focus</strong>
            <span>{model.focus || 'Complete the biblical plan to preview tomorrow’s focus.'}</span>
          </li>
          <li>
            <strong>Practice</strong>
            <span>{model.practice || '—'}</span>
          </li>
          <li>
            <strong>Training</strong>
            <span>{model.training || model.trainingMissing || '—'}</span>
          </li>
          <li>
            <strong>Work</strong>
            <span>{model.work || model.workMissing || '—'}</span>
          </li>
        </ul>
      )}

      {planLink ? (
        <p className="tomorrow-preview__link">
          <Link to={planLink}>Open weekly plan</Link>
        </p>
      ) : null}

      {showPrepare && !model.isSundayPlanning ? (
        <div className="tomorrow-preview__prepare">
          {!showChecklist ? (
            <Button variant="ghost" onClick={() => setShowChecklist(true)}>
              Prepare for tomorrow
            </Button>
          ) : (
            <div className="tomorrow-preview__checklist">
              <p className="today-panel__label">Prepare for tomorrow</p>
              {(
                [
                  ['readingIdentified', 'Reading identified'],
                  ['workoutTimeSelected', 'Workout time selected'],
                  ['workPriorityClear', 'Work priority clear'],
                  ['materialsReady', 'Any needed materials ready'],
                  ['morningStartConfirmed', 'Morning start time confirmed'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="tomorrow-preview__check">
                  <input
                    type="checkbox"
                    checked={Boolean(readiness[key])}
                    onChange={(e) => patchReady({ [key]: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
              <Button
                onClick={() => {
                  setReadiness(markReadyForTomorrow(targetDate));
                  setShowChecklist(false);
                }}
              >
                I’m ready for tomorrow
              </Button>
              {readiness.readyAt ? (
                <p className="tomorrow-preview__ready-note">Marked ready for {targetDate}.</p>
              ) : null}
              <button
                type="button"
                className="tomorrow-preview__dismiss"
                onClick={() => {
                  setShowChecklist(false);
                  if (!readiness.readyAt) {
                    setReadiness(emptyTomorrowReadiness(targetDate));
                  }
                }}
              >
                Close
              </button>
            </div>
          )}
          {!showChecklist && readiness.readyAt ? (
            <p className="tomorrow-preview__ready-note">You’re marked ready for tomorrow.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
