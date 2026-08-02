import { readPhysicalPlan } from './planCatalog';
import { readPhysicalTracker, todayDateKey, writePhysicalTracker } from './store';
import type { StepsDayEntry } from './types';

function emptySteps(dateKey: string): StepsDayEntry {
  const target = readPhysicalPlan().targets.steps;
  const source = readPhysicalPlan().targets.stepsSource;
  return {
    dateKey,
    syncedBase: 0,
    manualDelta: 0,
    manualTotal: null,
    target,
    source,
    updatedAt: new Date().toISOString(),
  };
}

export function getStepsDay(dateKey = todayDateKey()): StepsDayEntry {
  const state = readPhysicalTracker();
  return state.steps.find((s) => s.dateKey === dateKey) ?? emptySteps(dateKey);
}

export function effectiveSteps(entry: StepsDayEntry): number {
  if (entry.manualTotal != null) return Math.max(0, entry.manualTotal);
  return Math.max(0, entry.syncedBase + entry.manualDelta);
}

function upsert(entry: StepsDayEntry): StepsDayEntry {
  const state = readPhysicalTracker();
  const index = state.steps.findIndex((s) => s.dateKey === entry.dateKey);
  const next = { ...entry, updatedAt: new Date().toISOString() };
  if (index >= 0) state.steps[index] = next;
  else state.steps.push(next);
  writePhysicalTracker(state);
  return next;
}

export function adjustSteps(delta: number, dateKey = todayDateKey()): StepsDayEntry {
  const current = getStepsDay(dateKey);
  if (current.manualTotal != null) {
    return upsert({
      ...current,
      manualTotal: Math.max(0, current.manualTotal + delta),
      source: 'manual',
    });
  }
  return upsert({
    ...current,
    manualDelta: current.manualDelta + delta,
    source: current.syncedBase > 0 ? 'synced' : 'manual',
  });
}

export function setStepsTotal(total: number, dateKey = todayDateKey()): StepsDayEntry {
  const current = getStepsDay(dateKey);
  return upsert({
    ...current,
    manualTotal: Math.max(0, Math.round(total)),
    source: 'manual',
  });
}

/** Apply a synced health-source reading without wiping manual corrections. */
export function applySyncedSteps(syncedBase: number, dateKey = todayDateKey()): StepsDayEntry {
  const current = getStepsDay(dateKey);
  return upsert({
    ...current,
    syncedBase: Math.max(0, Math.round(syncedBase)),
    source: 'synced',
    // Keep manualTotal / manualDelta so corrections survive sync updates.
  });
}

export function setStepsTarget(target: number, dateKey = todayDateKey()): StepsDayEntry {
  const current = getStepsDay(dateKey);
  return upsert({ ...current, target: Math.max(0, Math.round(target)) });
}
