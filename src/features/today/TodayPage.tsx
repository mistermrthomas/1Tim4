import { useEffect, useState } from 'react';
import { isSundayPlanningDay } from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import { getActivePlanForDate } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { SundayPlanningHome } from './SundayPlanningHome';
import { TodayActiveWeek } from './TodayActiveWeek';
import { TodayPlanningEmpty } from './TodayPlanningEmpty';
import './TodayPage.css';

export function TodayPage() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [ready, setReady] = useState(false);
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

  if (!ready) {
    return (
      <div className="today-preview">
        <p className="today-preview__loading">
          {sunday ? 'Preparing Sunday planning…' : 'Preparing today’s training…'}
        </p>
      </div>
    );
  }

  // Sunday: dedicated weekly-planning dashboard (draft or active).
  if (sunday) {
    return <SundayPlanningHome />;
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
