/** Lightweight night-before readiness checklist (does not block activation). */

import { notifyAccountBag } from '../../services/notifyAccountBag';
import type { DateKey } from '../calendar/week';

const KEY = 'path-tomorrow-readiness-v1';

export interface TomorrowReadiness {
  targetDate: DateKey;
  readingIdentified: boolean;
  workoutTimeSelected: boolean;
  workPriorityClear: boolean;
  materialsReady: boolean;
  morningStartConfirmed: boolean;
  readyAt: string | null;
}

export function emptyTomorrowReadiness(targetDate: DateKey): TomorrowReadiness {
  return {
    targetDate,
    readingIdentified: false,
    workoutTimeSelected: false,
    workPriorityClear: false,
    materialsReady: false,
    morningStartConfirmed: false,
    readyAt: null,
  };
}

export function readTomorrowReadiness(targetDate: DateKey): TomorrowReadiness {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyTomorrowReadiness(targetDate);
    const parsed = JSON.parse(raw) as Record<string, TomorrowReadiness>;
    const row = parsed[targetDate];
    if (!row) return emptyTomorrowReadiness(targetDate);
    return { ...emptyTomorrowReadiness(targetDate), ...row, targetDate };
  } catch {
    return emptyTomorrowReadiness(targetDate);
  }
}

export function writeTomorrowReadiness(state: TomorrowReadiness): TomorrowReadiness {
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, TomorrowReadiness>) : {};
    all[state.targetDate] = state;
    localStorage.setItem(KEY, JSON.stringify(all));
    notifyAccountBag('tomorrow_readiness');
  } catch {
    /* ignore */
  }
  return state;
}

export function markReadyForTomorrow(targetDate: DateKey): TomorrowReadiness {
  const current = readTomorrowReadiness(targetDate);
  return writeTomorrowReadiness({
    ...current,
    readingIdentified: true,
    workoutTimeSelected: true,
    workPriorityClear: true,
    materialsReady: true,
    morningStartConfirmed: true,
    readyAt: new Date().toISOString(),
  });
}
