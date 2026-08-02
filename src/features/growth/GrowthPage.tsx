import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { loadBiblicalDay } from '../../domain/biblical/dayLog';
import { totalIntake } from '../../domain/physical/intakeTracker';
import { todayDateKey } from '../../domain/physical/store';
import { listCompletedSessions } from '../../domain/physical/workoutTracker';
import { resolvePlanConfig } from '../../domain/training/activePlan';
import { ProgressMeter } from '../../ui/ProgressMeter';
import './GrowthPage.css';

export function GrowthPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const dateKey = todayDateKey();

  useEffect(() => {
    loadSeasonPack()
      .then(setPack)
      .catch(() => setPack(null));
  }, []);

  const biblical = loadBiblicalDay(dateKey);
  const sessions = useMemo(() => listCompletedSessions(), []);
  const protein = totalIntake(dateKey, 'protein');
  const water = totalIntake(dateKey, 'water');
  const targets = pack ? resolvePlanConfig(pack).physical.foundations : { proteinG: 120, waterOz: 80 };

  const completedWorkouts = sessions.filter((s) => s.status === 'completed').length;
  const partialWorkouts = sessions.filter((s) => s.status === 'partial').length;

  return (
    <div className="growth-preview path-fade-in">
      <header className="growth-preview__hero">
        <p className="path-eyebrow">Review progress</p>
        <h1 className="path-display growth-preview__title">Growth</h1>
        <p className="path-body growth-preview__lede">
          Biblical growth and physical progress stay separate. Completion supports change — it is
          not the whole story.
        </p>
      </header>

      <section className="growth-section" aria-labelledby="growth-biblical">
        <h2 id="growth-biblical" className="path-display growth-section__title">
          Biblical growth
        </h2>
        <ul className="growth-section__meters">
          <li className="path-surface">
            <ProgressMeter
              label="Practices completed today"
              valueLabel={biblical.practiceDone ? 'Done' : 'Open'}
              percent={biblical.practiceDone ? 100 : biblical.practiceAccepted ? 50 : 0}
            />
          </li>
          <li className="path-surface">
            <ProgressMeter
              label="Checkpoints"
              valueLabel={biblical.morningDone ? 'Morning complete' : 'In progress'}
              percent={biblical.morningDone ? 100 : biblical.expectedTest ? 40 : 10}
            />
          </li>
        </ul>
        <ul className="growth-section__cards">
          <li className="path-surface">
            <p className="growth-section__card-title">Reflection themes</p>
            <p className="path-body">
              {Object.values(biblical.eveningNotes).filter((n) => n.trim()).length
                ? Object.values(biblical.eveningNotes)
                    .filter((n) => n.trim())
                    .join(' · ')
                : 'Evening reflections will collect here as you train.'}
            </p>
          </li>
          <li className="path-surface">
            <p className="growth-section__card-title">Character focus history</p>
            <p className="path-body">
              Active biblical season focus continues across Journey weeks — not tied to today’s
              workout.
            </p>
          </li>
        </ul>
      </section>

      <section className="growth-section" aria-labelledby="growth-physical">
        <h2 id="growth-physical" className="path-display growth-section__title">
          Physical progress
        </h2>
        <ul className="growth-section__meters">
          <li className="path-surface">
            <ProgressMeter
              label="Workouts completed"
              valueLabel={`${completedWorkouts} complete · ${partialWorkouts} partial`}
              percent={Math.min(100, completedWorkouts * 25)}
            />
          </li>
          <li className="path-surface">
            <ProgressMeter
              label="Protein adherence today"
              valueLabel={`${protein} / ${targets.proteinG}g`}
              percent={Math.min(100, Math.round((protein / Math.max(targets.proteinG, 1)) * 100))}
            />
          </li>
          <li className="path-surface">
            <ProgressMeter
              label="Water adherence today"
              valueLabel={`${water} / ${targets.waterOz} oz`}
              percent={Math.min(100, Math.round((water / Math.max(targets.waterOz, 1)) * 100))}
            />
          </li>
        </ul>

        <div className="growth-history path-surface">
          <p className="growth-section__card-title">Workout history</p>
          {sessions.length ? (
            <ul className="growth-history__list">
              {sessions.slice(0, 6).map((session) => (
                <li key={session.id}>
                  <strong>{session.workoutName}</strong>
                  <span>
                    {session.dateKey} · {session.status.replace('_', ' ')} ·{' '}
                    {session.exercises.filter((e) => e.completed).length}/
                    {session.exercises.length} exercises
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="path-body">Completed workouts from the tracker will appear here.</p>
          )}
          <p className="growth-history__note">
            Detailed exercise progression lives in the workout tracker history — Growth summarizes
            it.
          </p>
        </div>
      </section>

      <div className="growth-preview__actions">
        <Link className="path-btn path-btn--primary" to="/today">
          Return to today’s training
        </Link>
        <Link className="path-btn path-btn--ghost" to="/coach">
          Ask Coach for adjustments
        </Link>
      </div>
    </div>
  );
}
