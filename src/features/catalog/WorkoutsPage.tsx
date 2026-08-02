import { useState } from 'react';
import { Link } from 'react-router-dom';
import { readPhysicalPlan } from '../../domain/physical/planCatalog';
import './CatalogPages.css';

export function WorkoutsPage() {
  const [plan] = useState(() => readPhysicalPlan());

  return (
    <div className="catalog-page path-fade-in">
      <header className="catalog-page__hero">
        <p className="path-eyebrow">Training library</p>
        <h1 className="path-display catalog-page__title">Workouts</h1>
        <p className="path-body">
          Templates you can assign to days in the weekly plan. Empty templates are ready to build —
          nothing is scheduled until you activate a week.
        </p>
      </header>
      <div className="catalog-page__toolbar">
        <Link className="path-btn path-btn--ghost" to="/exercises">
          Exercises
        </Link>
        <Link className="path-btn path-btn--primary" to="/plan/week">
          Assign in weekly plan
        </Link>
      </div>
      <ul className="catalog-page__list">
        {plan.templates.map((tmpl) => (
          <li key={tmpl.id} className="path-surface catalog-page__card">
            <h2 className="catalog-page__card-title">{tmpl.name}</h2>
            <p className="path-body">
              {tmpl.exercises.length
                ? tmpl.exercises
                    .map((row) => {
                      const ex = plan.exercises.find((e) => e.id === row.exerciseId);
                      return ex?.name ?? row.exerciseId;
                    })
                    .join(' · ')
                : 'No exercises yet — edit via weekly planning or extend later.'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
