import { todayDateKey, newId } from '../physical/store';

import { notifyAccountBag } from '../../services/notifyAccountBag';

export const BODY_STORE_KEY = 'path-body-metrics-v1';

export type BodyEntry = {
  id: string;
  date: string;
  weightLb: number | null;
  bodyFatPct: number | null;
  leanMassLb: number | null;
  skeletalMuscleLb: number | null;
  visceralFatIndex: number | null;
  waistIn: number | null;
  note: string;
  createdAt: string;
};

type BodyState = {
  version: 1;
  showBmi: boolean;
  entries: BodyEntry[];
};

function empty(): BodyState {
  return { version: 1, showBmi: false, entries: [] };
}

export function readBodyState(): BodyState {
  try {
    const raw = localStorage.getItem(BODY_STORE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as BodyState;
    if (parsed.version !== 1) return empty();
    return {
      version: 1,
      showBmi: Boolean(parsed.showBmi),
      entries: parsed.entries ?? [],
    };
  } catch {
    return empty();
  }
}

function write(state: BodyState): void {
  localStorage.setItem(BODY_STORE_KEY, JSON.stringify(state));
  notifyAccountBag('body');
}

export function setShowBmi(show: boolean): BodyState {
  const state = readBodyState();
  const next = { ...state, showBmi: show };
  write(next);
  return next;
}

export function upsertBodyEntry(input: Partial<Omit<BodyEntry, 'id' | 'createdAt'>> & { id?: string }): BodyEntry {
  const state = readBodyState();
  const date = input.date ?? todayDateKey();
  if (input.id) {
    const nextEntries = state.entries.map((entry) =>
      entry.id === input.id
        ? {
            ...entry,
            date,
            weightLb: input.weightLb ?? entry.weightLb,
            bodyFatPct: input.bodyFatPct ?? entry.bodyFatPct,
            leanMassLb: input.leanMassLb ?? entry.leanMassLb,
            skeletalMuscleLb: input.skeletalMuscleLb ?? entry.skeletalMuscleLb,
            visceralFatIndex: input.visceralFatIndex ?? entry.visceralFatIndex,
            waistIn: input.waistIn ?? entry.waistIn,
            note: (input.note ?? entry.note).trim(),
          }
        : entry,
    );
    write({ ...state, entries: nextEntries });
    return nextEntries.find((e) => e.id === input.id)!;
  }

  const entry: BodyEntry = {
    id: newId('body'),
    date,
    weightLb: input.weightLb ?? null,
    bodyFatPct: input.bodyFatPct ?? null,
    leanMassLb: input.leanMassLb ?? null,
    skeletalMuscleLb: input.skeletalMuscleLb ?? null,
    visceralFatIndex: input.visceralFatIndex ?? null,
    waistIn: input.waistIn ?? null,
    note: (input.note ?? '').trim(),
    createdAt: new Date().toISOString(),
  };
  write({ ...state, entries: [entry, ...state.entries] });
  return entry;
}

export function recentBodyEntries(limit = 12): BodyEntry[] {
  return readBodyState()
    .entries.slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function latestBodyEntry(): BodyEntry | null {
  return recentBodyEntries(1)[0] ?? null;
}
