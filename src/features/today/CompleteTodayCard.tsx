import { Button } from '../../ui/Button';
import type {
  DayClosureQuality,
  DayCompletionRecord,
  DayCompletionSummary,
  DayCompletionType,
} from '../../domain/today/dayCompletion';

function labelConcrete(status: DayCompletionSummary['concreteActionStatus']): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'carried_forward':
      return 'Carry forward';
    default:
      return 'Not completed';
  }
}

function labelWorkout(status: DayCompletionSummary['workoutStatus']): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'skipped':
      return 'Skipped intentionally';
    case 'partial':
      return 'Partial';
    default:
      return 'Not scheduled';
  }
}

function labelWork(status: DayCompletionSummary['workStatus']): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'deferred':
      return 'Deferred';
    case 'carried_forward':
      return 'Carry forward';
    default:
      return 'Not scheduled';
  }
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function CompleteTodayCard({
  variant,
  eligible,
  missing,
  completed,
  record,
  summary,
  closureQuality,
  onComplete,
  onReview,
  onReopen,
  completing = false,
}: {
  variant: DayCompletionType;
  eligible: boolean;
  missing: string[];
  completed: boolean;
  record: DayCompletionRecord;
  summary: DayCompletionSummary | null;
  closureQuality: DayClosureQuality | null;
  onComplete: () => void;
  onReview?: () => void;
  onReopen?: () => void;
  completing?: boolean;
}) {
  const titles = {
    weekday: {
      ready: 'Ready to complete',
      readyBody: 'You have recorded today’s Biblical practice, training, and work outcomes.',
      action: 'Complete today',
      done: 'Day complete',
      doneBody: 'Today’s commitments have been recorded.',
    },
    planning_day: {
      ready: 'The week is ready',
      readyBody: 'Monday’s reading, practice, training, and work priority are prepared.',
      action: 'Complete planning day',
      done: 'Planning complete',
      doneBody: 'Your week is activated and Monday is ready. Close Path until tomorrow.',
    },
    weekly_reflection: {
      ready: 'Week complete',
      readyBody:
        'Keep what needs continued practice. Release what does not need to follow you into next week.',
      action: 'Complete the week',
      done: 'Week complete',
      doneBody: 'This week’s reflection has been recorded.',
    },
  }[variant];

  if (completed && summary) {
    return (
      <section className="complete-today complete-today--done path-surface" aria-live="polite">
        <div className="complete-today__seal" aria-hidden>
          ✓
        </div>
        <p className="today-panel__label">{titles.done}</p>
        <p className="complete-today__body">{titles.doneBody}</p>
        <ul className="complete-today__summary">
          <li>
            <strong>Biblical practice</strong>
            <span>{summary.biblicalPracticeCompleted ? 'Recorded' : 'Reviewed'}</span>
          </li>
          <li>
            <strong>Concrete action</strong>
            <span>{labelConcrete(summary.concreteActionStatus)}</span>
          </li>
          <li>
            <strong>Training</strong>
            <span>{labelWorkout(summary.workoutStatus)}</span>
          </li>
          <li>
            <strong>Work priority</strong>
            <span>{labelWork(summary.workStatus)}</span>
          </li>
          <li>
            <strong>Health targets</strong>
            <span>
              {summary.healthTargetsReached} of {summary.healthTargetsTotal} reached
            </span>
          </li>
        </ul>
        {closureQuality === 'closed_with_unfinished' ? (
          <p className="complete-today__note">
            Closed with unfinished items — distinct from completing everything as planned.
          </p>
        ) : null}
        {record.completedAt ? (
          <p className="complete-today__time">Completed at {formatTime(record.completedAt)}</p>
        ) : null}
        {onReopen ? (
          <button type="button" className="complete-today__reopen" onClick={onReopen}>
            Reopen day
          </button>
        ) : null}
      </section>
    );
  }

  if (!eligible) {
    return (
      <section className="complete-today complete-today--waiting path-surface">
        <p className="today-panel__label">Day progress</p>
        <p className="complete-today__body">
          Record an outcome for each required area before closing the day. Health targets stay
          optional.
        </p>
        {missing.length ? (
          <p className="complete-today__missing">Still needed: {missing.join(' · ')}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="complete-today complete-today--ready path-surface">
      <p className="today-panel__label">{titles.ready}</p>
      <p className="complete-today__body">{titles.readyBody}</p>
      <div className="complete-today__actions">
        <Button onClick={onComplete} disabled={completing}>
          {completing ? 'Saving…' : titles.action}
        </Button>
        {onReview ? (
          <Button variant="ghost" onClick={onReview}>
            Review today
          </Button>
        ) : null}
      </div>
    </section>
  );
}
