import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatRecommendedNext,
  formatWeight,
} from '../../domain/strength/progression';
import { latestEntry, readStrengthState } from '../../domain/strength/store';
import './CatalogPages.css';

export function ExercisesPage() {
  const [state] = useState(() => readStrengthState());
  const exercises = useMemo(
    () =>
      [...state.exercises].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        const workoutA =
          state.workouts.find((w) => w.id === a.workoutId)?.order ?? Number.MAX_SAFE_INTEGER;
        const workoutB =
          state.workouts.find((w) => w.id === b.workoutId)?.order ?? Number.MAX_SAFE_INTEGER;
        if (workoutA !== workoutB) return workoutA - workoutB;
        return a.order - b.order || a.name.localeCompare(b.name);
      }),
    [state.exercises, state.workouts],
  );

  return (
    <div className="catalog-page path-fade-in">
      <header className="catalog-page__hero">
        <p className="path-eyebrow">Strength library</p>
        <h1 className="path-display catalog-page__title">Exercises</h1>
        <p className="path-body">
          Names stay equipment-agnostic. Equipment and max load are listed separately. Open the
          strength log for the full editable progression table.
        </p>
      </header>
      <div className="catalog-page__toolbar">
        <Link className="path-btn path-btn--primary" to="/workouts">
          Open strength log
        </Link>
      </div>
      <div className="path-surface" style={{ padding: '0.85rem 1rem', overflowX: 'auto' }}>
        <table className="catalog-exercise-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Equipment</th>
              <th>Max</th>
              <th>Workout</th>
              <th>Last</th>
              <th>Next</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise) => {
              const last = latestEntry(state, exercise.id);
              const workout = state.workouts.find((w) => w.id === exercise.workoutId);
              return (
                <tr key={exercise.id}>
                  <td>
                    <strong>{exercise.name}</strong>
                  </td>
                  <td>{exercise.equipment}</td>
                  <td>
                    {exercise.maxWeightLb != null
                      ? formatWeight(exercise.maxWeightLb, exercise.weightSuffix)
                      : '—'}
                  </td>
                  <td>{workout ? `W${workout.order}` : '—'}</td>
                  <td>
                    {last ? formatWeight(last.weightLb, exercise.weightSuffix) : '—'}
                  </td>
                  <td>{formatRecommendedNext(exercise, last)}</td>
                  <td>{exercise.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <Link
                      to={`/workouts?exercise=${exercise.id}${
                        exercise.workoutId ? `&w=${exercise.workoutId}` : ''
                      }`}
                    >
                      History
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
