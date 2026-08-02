import { useEffect, useState } from 'react';
import { getActivePlanForDate } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { todayDateKey } from '../../domain/physical/store';
import { TodayActiveWeek } from './TodayActiveWeek';
import { TodayPlanningEmpty } from './TodayPlanningEmpty';
import './TodayPage.css';

export function TodayPage() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [ready, setReady] = useState(false);
  const dateKey = todayDateKey();

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

  if (!ready) {
    return (
      <div className="today-preview">
        <p className="today-preview__loading">Preparing today’s training…</p>
      </div>
    );
  }

  if (!weeklyPlan || weeklyPlan.status !== 'active') {
    return <TodayPlanningEmpty />;
  }

  return (
    <TodayActiveWeek
      weeklyPlan={weeklyPlan}
      onPlanChange={(plan) => {
        setWeeklyPlan(plan.status === 'active' ? plan : null);
      }}
    />
  );
}
