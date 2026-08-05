import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isSundayPlanningDay } from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import { hasGeneratedBiblicalTraining } from '../../domain/sermon/fromWeeklyPlan';
import { getActivePlanForDate } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { SundaySermonPrompt } from './SundaySermonPrompt';
import { TodayActiveWeek } from './TodayActiveWeek';
import { TodayPlanningEmpty } from './TodayPlanningEmpty';
import './TodayPage.css';

export function TodayPage() {
  const location = useLocation();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [successFlash, setSuccessFlash] = useState(
    Boolean((location.state as { sermonReady?: boolean } | null)?.sermonReady),
  );
  const dateKey = todayDateKey();
  const sunday = isSundayPlanningDay();

  useEffect(() => {
    let cancelled = false;
    getActivePlanForDate(dateKey)
      .then((plan) => {
        if (!cancelled) {
          setWeeklyPlan(plan);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeeklyPlan(null);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  useEffect(() => {
    if (!successFlash) return;
    const t = window.setTimeout(() => setSuccessFlash(false), 4500);
    return () => window.clearTimeout(t);
  }, [successFlash]);

  if (!ready) {
    return (
      <div className="today-preview">
        <p className="today-preview__loading">Preparing today’s training…</p>
      </div>
    );
  }

  const weekReady =
    Boolean(weeklyPlan) &&
    weeklyPlan!.status === 'active' &&
    hasGeneratedBiblicalTraining(weeklyPlan);

  if (sunday && !weekReady) {
    return <SundaySermonPrompt />;
  }

  if (!weekReady) {
    return <TodayPlanningEmpty />;
  }

  return (
    <>
      {successFlash ? (
        <p className="today-sermon-ready" role="status">
          This week’s training is ready.
        </p>
      ) : null}
      <TodayActiveWeek
        weeklyPlan={weeklyPlan!}
        onPlanChange={(plan) => {
          setWeeklyPlan(plan.status === 'active' ? plan : null);
        }}
      />
    </>
  );
}
