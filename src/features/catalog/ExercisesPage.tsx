import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { readStrengthState } from '../../domain/strength/store';
import './CatalogPages.css';

export function ExercisesPage() {
  const [state] = useState(() => readStrengthState());
  const exercises = useMemo(
    () =>
      [...state.exercises].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [state.exercises],
  );

  return (
    <div className="catalog-page path-fade-in">
      <header className="catalog-page__hero">
        <p className="path-eyebrow">Strength library</p>
        <h1 className="path-display catalog-page__title">Exercises</h1>
        <p className="path-body">
          Active lifts live in Workout 1 and Workout 2. Inactive exercises keep their history.
        </p>
      </header>
      <div className="catalog-page__toolbar">
        <Link className="path-btn path-btn--primary" to="/workouts">
          Open strength log
        </Link>
      </div>
      <ul className="catalog-page__list">
        {exercises.map((exercise) => (
          <li key={exercise.id} className="path-surface catalog-page__card">
            <h2 className="catalog-page__card-title">{exercise.name}</h2>
            <p className="path-body" style={{ opacity: 0.75, marginBottom: '0.35rem' }}>
              {exercise.muscleGroup} · {exercise.equipment}
              {exercise.active ? ' · Active' : ' · Inactive (history preserved)'}
            </p>
            {exercise.techniqueNote ? (
              <p className="path-body">{exercise.techniqueNote}</p>
            ) : null}
            <Link
              className="path-btn path-btn--ghost"
              to={`/workouts?exercise=${exercise.id}${
                exercise.workoutId ? `&w=${exercise.workoutId}` : ''
              }`}
              style={{ marginTop: '0.65rem', display: 'inline-flex', textDecoration: 'none' }}
            >
              Open history
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
