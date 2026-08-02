import { newId, readPhysicalTracker, todayDateKey, writePhysicalTracker } from './store';
import type { IntakeEntry, IntakeKind, PhysicalDayMeta } from './types';

export function listIntakeForDay(dateKey = todayDateKey(), kind?: IntakeKind): IntakeEntry[] {
  return readPhysicalTracker()
    .intake.filter((e) => e.dateKey === dateKey && (!kind || e.kind === kind))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function totalIntake(dateKey: string, kind: IntakeKind): number {
  return listIntakeForDay(dateKey, kind).reduce((sum, e) => sum + e.amount, 0);
}

export function addIntake(
  kind: IntakeKind,
  amount: number,
  unit: string,
  note?: string,
  dateKey = todayDateKey(),
  entryMethod = 'manual',
): IntakeEntry {
  if (amount <= 0) {
    throw new Error('Intake amount must be positive');
  }
  const state = readPhysicalTracker();
  const entry: IntakeEntry = {
    id: newId(kind === 'protein' ? 'pro' : 'h2o'),
    dateKey,
    kind,
    amount,
    unit,
    note,
    entryMethod,
    createdAt: new Date().toISOString(),
  };
  state.intake.push(entry);
  writePhysicalTracker(state);
  return entry;
}

export function undoLastIntake(kind: IntakeKind, dateKey = todayDateKey()): IntakeEntry | null {
  const state = readPhysicalTracker();
  const candidates = state.intake
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.dateKey === dateKey && entry.kind === kind);
  const last = candidates[candidates.length - 1];
  if (!last) return null;
  state.intake.splice(last.index, 1);
  writePhysicalTracker(state);
  return last.entry;
}

export function getDayMeta(dateKey = todayDateKey()): PhysicalDayMeta {
  return (
    readPhysicalTracker().dayMeta.find((d) => d.dateKey === dateKey) ?? {
      dateKey,
      recoveryDone: false,
    }
  );
}

export function setRecoveryDone(done: boolean, dateKey = todayDateKey()): PhysicalDayMeta {
  const state = readPhysicalTracker();
  const index = state.dayMeta.findIndex((d) => d.dateKey === dateKey);
  const meta: PhysicalDayMeta = { dateKey, recoveryDone: done };
  if (index >= 0) state.dayMeta[index] = meta;
  else state.dayMeta.push(meta);
  writePhysicalTracker(state);
  return meta;
}

export function getWaterUnit(): 'oz' | 'ml' | 'L' {
  return readPhysicalTracker().waterUnit;
}

export function setWaterUnit(unit: 'oz' | 'ml' | 'L'): void {
  const state = readPhysicalTracker();
  state.waterUnit = unit;
  writePhysicalTracker(state);
}
