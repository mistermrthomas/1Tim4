import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  readPhysicalPlan,
  updateCatalogExercise,
  type CatalogExercise,
} from '../../domain/physical/planCatalog';
import { Button } from '../../ui/Button';
import './CatalogPages.css';

export function ExercisesPage() {
  const [exercises, setExercises] = useState(() => readPhysicalPlan().exercises);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q) ||
        e.muscleGroups.some((m) => m.includes(q)),
    );
  }, [exercises, filter]);

  const save = (ex: CatalogExercise) => {
    updateCatalogExercise(ex.id, ex);
    setExercises(readPhysicalPlan().exercises);
    setEditingId(null);
  };

  return (
    <div className="catalog-page path-fade-in">
      <header className="catalog-page__hero">
        <p className="path-eyebrow">Training library</p>
        <h1 className="path-display catalog-page__title">Exercises</h1>
        <p className="path-body">
          Reusable catalog with last-used loads. Assigning nothing here until you place a workout on
          a day in the weekly plan.
        </p>
      </header>
      <div className="catalog-page__toolbar">
        <input
          className="catalog-page__search"
          placeholder="Filter by name or equipment"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Link className="path-btn path-btn--ghost" to="/workouts">
          Workouts
        </Link>
        <Link className="path-btn path-btn--ghost" to="/plan/week">
          Weekly plan
        </Link>
      </div>
      <ul className="catalog-page__list">
        {filtered.map((ex) => (
          <li key={ex.id} className="path-surface catalog-page__card">
            <div className="catalog-page__card-head">
              <h2 className="catalog-page__card-title">{ex.name}</h2>
              <p className="path-label">{ex.equipment}</p>
            </div>
            {ex.useCautiously || ex.cautionNote ? (
              <p className="catalog-page__caution">Use cautiously — {ex.cautionNote.slice(0, 120)}…</p>
            ) : null}
            {editingId === ex.id ? (
              <div className="catalog-page__edit">
                <label className="path-field">
                  <span>Load</span>
                  <input
                    type="number"
                    value={ex.defaultLoad ?? ''}
                    onChange={(e) =>
                      setExercises((prev) =>
                        prev.map((row) =>
                          row.id === ex.id
                            ? {
                                ...row,
                                defaultLoad: e.target.value === '' ? null : Number(e.target.value),
                              }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
                <label className="path-field">
                  <span>Sets</span>
                  <input
                    type="number"
                    value={ex.defaultSets}
                    onChange={(e) =>
                      setExercises((prev) =>
                        prev.map((row) =>
                          row.id === ex.id
                            ? { ...row, defaultSets: Number(e.target.value) || 0 }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
                <label className="path-field">
                  <span>Reps</span>
                  <input
                    value={ex.defaultReps}
                    onChange={(e) =>
                      setExercises((prev) =>
                        prev.map((row) =>
                          row.id === ex.id ? { ...row, defaultReps: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
                <Button onClick={() => save(exercises.find((e) => e.id === ex.id)!)}>Save</Button>
                <Button variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <p className="path-body">
                  {ex.defaultLoad != null ? `${ex.defaultLoad} ${ex.defaultLoadUnit}` : 'Bodyweight / unset'}{' '}
                  · {ex.defaultSets}×{ex.defaultReps}
                </p>
                <Button variant="ghost" onClick={() => setEditingId(ex.id)}>
                  Edit last-used
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
