import { useState } from 'react';
import { Link } from 'react-router-dom';
import { todayDateKey } from '../../domain/physical/store';
import {
  extraGroupsForWorkout,
  readGroupPicks,
  selectedGroupsForWorkout,
  suggestedGroupsForWorkout,
  toggleGroupInList,
  workoutHref,
  writeGroupPicks,
  type GroupPicksState,
} from '../../domain/strength/muscleGroups';
import type { StrengthState, StrengthWorkout } from '../../domain/strength/types';
import './MuscleGroupPicker.css';

export function useGroupPicks(date = todayDateKey()) {
  const [picks, setPicks] = useState<GroupPicksState>(() => readGroupPicks(date));

  const setWorkoutGroups = (workoutId: string, groups: string[]) => {
    const next: GroupPicksState = {
      date,
      byWorkout: { ...picks.byWorkout, [workoutId]: groups },
    };
    writeGroupPicks(next);
    setPicks(next);
  };

  return { picks, setWorkoutGroups };
}

export function MuscleGroupPicker({
  state,
  workout,
  picks,
  onChange,
  showBegin = true,
}: {
  state: StrengthState;
  workout: StrengthWorkout;
  picks: GroupPicksState;
  onChange: (workoutId: string, groups: string[]) => void;
  showBegin?: boolean;
}) {
  const suggested = suggestedGroupsForWorkout(state, workout.id);
  const extras = extraGroupsForWorkout(state, workout.id);
  const selected = selectedGroupsForWorkout(state, workout.id, picks);
  const selectedSet = new Set(selected);
  const href = workoutHref(workout.id, selected);
  const extraSelected = extras.filter((group) => selectedSet.has(group));

  const toggle = (group: string) => {
    onChange(workout.id, toggleGroupInList(selected, group));
  };

  return (
    <section className="muscle-picker" aria-label={workout.shortLabel}>
      <div className="muscle-picker__head">
        <p className="muscle-picker__eyebrow">Workout {workout.order}</p>
        <h3 className="muscle-picker__title">{workout.shortLabel}</h3>
        <p className="muscle-picker__hint">
          Suggested together. Uncheck a group to skip it, or add one from another workout.
        </p>
      </div>

      <div className="muscle-picker__groups" role="group" aria-label="Suggested muscle groups">
        {suggested.map((group) => (
          <label key={group} className="muscle-picker__check">
            <input
              type="checkbox"
              checked={selectedSet.has(group)}
              onChange={() => toggle(group)}
            />
            <span>{group}</span>
          </label>
        ))}
      </div>

      {extras.length ? (
        <details className="muscle-picker__extras" open={extraSelected.length > 0}>
          <summary>Also include from another workout</summary>
          <div className="muscle-picker__groups" role="group" aria-label="Additional muscle groups">
            {extras.map((group) => (
              <label key={group} className="muscle-picker__check muscle-picker__check--extra">
                <input
                  type="checkbox"
                  checked={selectedSet.has(group)}
                  onChange={() => toggle(group)}
                />
                <span>{group}</span>
              </label>
            ))}
          </div>
        </details>
      ) : null}

      {showBegin ? (
        <div className="muscle-picker__actions">
          {selected.length ? (
            <Link className="path-btn path-btn--primary" to={href}>
              Begin {selected.join(' / ')}
            </Link>
          ) : (
            <span className="muscle-picker__empty">Check at least one muscle group.</span>
          )}
          {selected.join() !== suggested.join() ? (
            <button
              type="button"
              className="path-btn path-btn--ghost"
              onClick={() => onChange(workout.id, suggested)}
            >
              Reset to suggested
            </button>
          ) : null}
        </div>
      ) : selected.join() !== suggested.join() ? (
        <div className="muscle-picker__actions">
          <button
            type="button"
            className="path-btn path-btn--ghost"
            onClick={() => onChange(workout.id, suggested)}
          >
            Reset to suggested
          </button>
        </div>
      ) : null}
    </section>
  );
}
