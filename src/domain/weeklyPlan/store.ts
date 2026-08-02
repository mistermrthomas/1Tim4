/**
 * Weekly plan persistence — IndexedDB (formation_local_v1 / entities).
 * Standalone weeks — no season parent.
 */

import { createIndexedDbAdapter } from '../../data/storage/indexedDbAdapter';
import type { StorageAdapter } from '../../data/storage/StorageAdapter';
import type { DateKey } from '../calendar/week';
import { buildDraftWeeklyPlan } from './factory';
import { normalizeWeeklyPlan, type WeeklyPlan, type WeeklyPlanIndex } from './types';

const INDEX_KEY = 'weeklyPlan:index';
const planKey = (id: string) => `weeklyPlan:plan:${id}`;

let memory: { index: WeeklyPlanIndex; plans: Map<string, WeeklyPlan> } | null = null;
let adapterPromise: Promise<StorageAdapter | null> | null = null;

function emptyIndex(): WeeklyPlanIndex {
  return { version: 2, byWeekStart: {}, activePlanId: null };
}

async function getAdapter(): Promise<StorageAdapter | null> {
  if (typeof indexedDB === 'undefined') return null;
  adapterPromise ??= Promise.resolve()
    .then(() => createIndexedDbAdapter())
    .catch(() => null);
  return adapterPromise;
}

function mem() {
  memory ??= { index: emptyIndex(), plans: new Map() };
  return memory;
}

async function readIndex(): Promise<WeeklyPlanIndex> {
  const adapter = await getAdapter();
  if (!adapter) return structuredClone(mem().index);
  const stored = await adapter.get<WeeklyPlanIndex>('entities', INDEX_KEY);
  if (!stored) return emptyIndex();
  return { ...emptyIndex(), ...stored, version: 2 };
}

async function readPlanById(id: string): Promise<WeeklyPlan | null> {
  const adapter = await getAdapter();
  const raw = !adapter ? (mem().plans.get(id) ?? null) : await adapter.get<WeeklyPlan>('entities', planKey(id));
  return raw ? normalizeWeeklyPlan(raw) : null;
}

export async function listWeeklyPlans(): Promise<WeeklyPlan[]> {
  const index = await readIndex();
  const ids = Object.values(index.byWeekStart);
  const plans = await Promise.all(ids.map((id) => readPlanById(id)));
  return plans.filter((p): p is WeeklyPlan => Boolean(p)).sort((a, b) =>
    b.weekStartDate.localeCompare(a.weekStartDate),
  );
}

export async function getWeeklyPlan(id: string): Promise<WeeklyPlan | null> {
  return readPlanById(id);
}

export async function getWeeklyPlanByWeekStart(weekStart: DateKey): Promise<WeeklyPlan | null> {
  const index = await readIndex();
  const id = index.byWeekStart[weekStart];
  if (!id) return null;
  return readPlanById(id);
}

export async function getActiveWeeklyPlan(): Promise<WeeklyPlan | null> {
  const index = await readIndex();
  if (!index.activePlanId) return null;
  return readPlanById(index.activePlanId);
}

export async function getActivePlanForDate(dateKey: DateKey): Promise<WeeklyPlan | null> {
  const active = await getActiveWeeklyPlan();
  if (!active) return null;
  if (dateKey < active.weekStartDate || dateKey > active.weekEndDate) return null;
  return active;
}

export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<WeeklyPlan> {
  const next = normalizeWeeklyPlan({ ...plan, updatedAt: new Date().toISOString() });
  const adapter = await getAdapter();
  const index = await readIndex();
  index.byWeekStart[next.weekStartDate] = next.id;

  if (!adapter) {
    mem().plans.set(next.id, structuredClone(next));
    mem().index = structuredClone(index);
    return next;
  }

  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(next.id), next);
    await tx.put('entities', INDEX_KEY, index);
  });
  return next;
}

export async function ensureWeeklyPlan(weekStart: DateKey): Promise<WeeklyPlan> {
  const existing = await getWeeklyPlanByWeekStart(weekStart);
  if (existing) return existing;
  const draft = buildDraftWeeklyPlan(weekStart);
  return saveWeeklyPlan(draft);
}

/** Resolve `/plan/week/:weekId` where weekId is a plan id or YYYY-MM-DD week start. */
export async function ensureWeeklyPlanByRef(weekId: string): Promise<WeeklyPlan> {
  if (/^\d{4}-\d{2}-\d{2}$/.test(weekId)) {
    return ensureWeeklyPlan(weekId);
  }
  const byId = await getWeeklyPlan(weekId);
  if (byId) return byId;
  throw new Error('Weekly plan not found');
}

export async function activateWeeklyPlan(planId: string): Promise<WeeklyPlan> {
  const plan = await readPlanById(planId);
  if (!plan) throw new Error('Weekly plan not found');

  const index = await readIndex();
  if (index.activePlanId && index.activePlanId !== planId) {
    const prev = await readPlanById(index.activePlanId);
    if (prev && prev.status === 'active') {
      await saveWeeklyPlan({ ...prev, status: 'archived' });
    }
  }

  const activated: WeeklyPlan = {
    ...plan,
    status: 'active',
    activatedAt: new Date().toISOString(),
    completedAt: null,
    biblical: { ...plan.biblical, approved: true },
    physical: { ...plan.physical, approved: true },
    work: { ...plan.work, approved: true },
  };

  index.activePlanId = activated.id;
  index.byWeekStart[activated.weekStartDate] = activated.id;

  const adapter = await getAdapter();
  if (!adapter) {
    mem().plans.set(activated.id, structuredClone(activated));
    mem().index = structuredClone(index);
    return activated;
  }

  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(activated.id), activated);
    await tx.put('entities', INDEX_KEY, index);
  });
  return activated;
}

/** Mark week completed after Saturday reflection. Clears active pointer if this was active. */
export async function completeWeeklyPlan(planId: string): Promise<WeeklyPlan> {
  const plan = await readPlanById(planId);
  if (!plan) throw new Error('Weekly plan not found');

  const completed: WeeklyPlan = {
    ...plan,
    status: 'completed',
    completedAt: new Date().toISOString(),
    saturdayReflection: {
      ...plan.saturdayReflection,
      completedAt: new Date().toISOString(),
    },
  };

  const index = await readIndex();
  if (index.activePlanId === planId) {
    index.activePlanId = null;
  }
  index.byWeekStart[completed.weekStartDate] = completed.id;

  const adapter = await getAdapter();
  if (!adapter) {
    mem().plans.set(completed.id, structuredClone(completed));
    mem().index = structuredClone(index);
    return completed;
  }

  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(completed.id), completed);
    await tx.put('entities', INDEX_KEY, index);
  });
  return completed;
}

export function __resetWeeklyPlanMemoryForTests(): void {
  memory = { index: emptyIndex(), plans: new Map() };
  adapterPromise = null;
}
