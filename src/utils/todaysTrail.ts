import type { DailyEntry, JourneyStage } from '../types';

export type TrailDayStatus = 'prepare' | 'live' | 'reflect' | 'complete';

export interface TodaysTrailStep {
  status: TrailDayStatus;
  nextStage: JourneyStage | null;
  nextPath: string | null;
  nextLabel: string | null;
  completedCount: number;
}

export function getTodaysTrailStep(entry: DailyEntry): TodaysTrailStep {
  const hasPrepare = !!entry.prepare;
  const hasLive = !!entry.live;
  const hasReflect = !!entry.reflect;
  const completedCount = [hasPrepare, hasLive, hasReflect].filter(Boolean).length;

  if (!hasPrepare) {
    return {
      status: 'prepare',
      nextStage: 'prepare',
      nextPath: '/prepare',
      nextLabel: 'Begin morning preparation',
      completedCount,
    };
  }
  if (!hasLive) {
    return {
      status: 'live',
      nextStage: 'live',
      nextPath: '/live',
      nextLabel: 'Midday check-in',
      completedCount,
    };
  }
  if (!hasReflect) {
    return {
      status: 'reflect',
      nextStage: 'reflect',
      nextPath: '/reflect',
      nextLabel: 'Evening reflection',
      completedCount,
    };
  }
  return {
    status: 'complete',
    nextStage: null,
    nextPath: null,
    nextLabel: null,
    completedCount,
  };
}
