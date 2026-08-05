import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { todayDateKey } from '../../domain/physical/store';
import {
  getWorkWeek,
  saveWorkWeek,
  weekStartFor,
  type WorkWeekLog,
} from '../../domain/workTraining/store';
import { getActivePlanForDate } from '../../domain/weeklyPlan/store';
import { Button } from '../../ui/Button';
import { PhysicalTrainingSections } from './PhysicalTrainingSections';
import './TrainingPage.css';

type Area = 'biblical' | 'physical' | 'work';

function areaFromParams(params: URLSearchParams): Area {
  const raw = params.get('area');
  if (raw === 'physical' || raw === 'work' || raw === 'biblical') return raw;
  return 'biblical';
}

export function TrainingPage() {
  const [params, setParams] = useSearchParams();
  const area = areaFromParams(params);
  const setArea = (next: Area) => {
    const copy = new URLSearchParams(params);
    copy.set('area', next);
    if (next !== 'physical') copy.delete('section');
    setParams(copy, { replace: true });
  };

  return (
    <div className="training-page path-fade-in">
      <header>
        <p className="path-eyebrow">Train for life</p>
        <h1 className="path-display training-page__title">Training</h1>
        <p className="training-page__lede">
          Three focused areas. Open one, do the next action, then leave.
        </p>
      </header>

      <div className="training-tabs" role="tablist" aria-label="Training areas">
        {(
          [
            ['biblical', 'Biblical', 'Discipleship'],
            ['physical', 'Physical', 'Strength & body'],
            ['work', 'Work', 'Leadership'],
          ] as const
        ).map(([id, label, job]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={area === id}
            className={`training-tabs__btn${area === id ? ' training-tabs__btn--active' : ''}`}
            onClick={() => setArea(id)}
          >
            <span className="training-tabs__label">{label}</span>
            <span className="training-tabs__job">{job}</span>
          </button>
        ))}
      </div>

      {area === 'biblical' ? <BiblicalTrainingPanel /> : null}
      {area === 'physical' ? <PhysicalTrainingSections /> : null}
      {area === 'work' ? <WorkTrainingPanel /> : null}
    </div>
  );
}

function BiblicalTrainingPanel() {
  const [planTitle, setPlanTitle] = useState<string>('Loading…');
  useEffect(() => {
    let cancelled = false;
    void getActivePlanForDate(todayDateKey()).then((plan) => {
      if (cancelled) return;
      setPlanTitle(
        plan?.church.sermonTitle ||
          plan?.biblical.weeklyTheme ||
          'No active weekly plan yet',
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="training-panel path-surface">
      <h2 className="training-panel__title path-display">Biblical training</h2>
      <p className="training-panel__lede">
        Turn Scripture and the sermon into a simple weekly practice. Keep mornings to 10–15
        minutes.
      </p>
      <dl className="training-grid training-grid--2">
        <div className="training-stat">
          <dt>This week</dt>
          <dd>{planTitle}</dd>
        </div>
      </dl>
      <div className="training-links">
        <Link className="path-btn path-btn--primary" to="/today">
          Today’s practice
        </Link>
        <Link className="path-btn path-btn--ghost" to="/plan/week">
          Weekly biblical plan
        </Link>
        <Link className="path-btn path-btn--ghost" to="/journey">
          Week history
        </Link>
      </div>
      <p className="training-meta">
        Enter sermon notes, receive a weekly plan, complete today’s reading and practice, then
        record a short evening reflection. No competing study tracks.
      </p>
    </section>
  );
}

function WorkTrainingPanel() {
  const weekStart = weekStartFor();
  const [week, setWeek] = useState<WorkWeekLog>(() => getWorkWeek(weekStart));

  const patch = (partial: Partial<WorkWeekLog>) => {
    setWeek((prev) => ({ ...prev, ...partial }));
  };

  return (
    <section className="training-panel path-surface">
      <h2 className="training-panel__title path-display">Work training</h2>
      <p className="training-panel__lede">
        Grow as a leader without another task board. One week at a time.
      </p>
      <p className="training-meta">Week of {weekStart}</p>
      <div className="training-form">
        {([0, 1, 2] as const).map((index) => (
          <label key={index} className="path-field">
            <span>Work priority {index + 1}</span>
            <input
              value={week.priorities[index]}
              onChange={(e) => {
                const priorities = [...week.priorities] as WorkWeekLog['priorities'];
                priorities[index] = e.target.value;
                patch({ priorities });
              }}
              placeholder={index === 0 ? 'Most important outcome this week' : 'Optional'}
            />
          </label>
        ))}
        <label className="path-field">
          <span>Leadership practice</span>
          <input
            value={week.leadershipPractice}
            onChange={(e) => patch({ leadershipPractice: e.target.value })}
            placeholder="Ask one more question before giving the answer"
          />
        </label>
        <label className="path-field">
          <span>Book insight or rule</span>
          <input
            value={week.bookInsight}
            onChange={(e) => patch({ bookInsight: e.target.value })}
            placeholder="Give people enough ownership to solve the problem"
          />
        </label>
        <label className="path-field">
          <span>Friday reflection</span>
          <textarea
            rows={3}
            value={week.fridayReflection}
            onChange={(e) => patch({ fridayReflection: e.target.value })}
            placeholder="What did I practice as a leader this week?"
          />
        </label>
        <Button
          onClick={() => {
            const saved = saveWorkWeek(week);
            setWeek(saved);
          }}
        >
          Save work week
        </Button>
      </div>
    </section>
  );
}
