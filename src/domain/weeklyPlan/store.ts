/**
 * Weekly plan persistence — IndexedDB cache (formation_local_v1 / entities).
 * When signed in, Supabase `path_weekly_plans` is the authoritative source of truth.
 */

import { createIndexedDbAdapter } from '../../data/storage/indexedDbAdapter';
import type { StorageAdapter } from '../../data/storage/StorageAdapter';
import type { DateKey } from '../calendar/week';
import { buildDraftWeeklyPlan } from './factory';
import { normalizeWeeklyPlan, type WeeklyPlan, type WeeklyPlanIndex } from './types';

/** Lazy notify to avoid circular import with cloudWeeklyPlanSync. */
function notifyCloud(plan: WeeklyPlan): void {
  void import('../../services/cloudWeeklyPlanSync')
    .then((m) => m.notifyWeeklyPlanSaved(plan))
    .catch(() => undefined);
}

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

async function persistLocal(
  plan: WeeklyPlan,
  indexPatch?: (index: WeeklyPlanIndex) => void,
): Promise<{ plan: WeeklyPlan; index: WeeklyPlanIndex }> {
  const next = normalizeWeeklyPlan(plan);
  const index = await readIndex();
  index.byWeekStart[next.weekStartDate] = next.id;
  indexPatch?.(index);

  const adapter = await getAdapter();
  if (!adapter) {
    mem().plans.set(next.id, structuredClone(next));
    mem().index = structuredClone(index);
    return { plan: next, index };
  }

  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(next.id), next);
    await tx.put('entities', INDEX_KEY, index);
  });
  return { plan: next, index };
}

export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<WeeklyPlan> {
  const { plan: next } = await persistLocal({
    ...plan,
    updatedAt: new Date().toISOString(),
  });
  notifyCloud(next);
  return next;
}

/** Apply a cloud plan into the local cache without scheduling another cloud push. */
export async function replaceWeeklyPlanFromCloud(plan: WeeklyPlan): Promise<WeeklyPlan> {
  const { plan: next } = await persistLocal(normalizeWeeklyPlan(plan));
  return next;
}

export async function setActiveWeeklyPlanId(planId: string | null): Promise<void> {
  const index = await readIndex();
  if (index.activePlanId === planId) return;
  index.activePlanId = planId;
  const adapter = await getAdapter();
  if (!adapter) {
    mem().index = structuredClone(index);
    return;
  }
  await adapter.put('entities', INDEX_KEY, index);
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

  const activatedSaved = normalizeWeeklyPlan({
    ...activated,
    updatedAt: new Date().toISOString(),
  });
  index.activePlanId = activatedSaved.id;
  index.byWeekStart[activatedSaved.weekStartDate] = activatedSaved.id;

  const adapter = await getAdapter();
  if (!adapter) {
    mem().plans.set(activatedSaved.id, structuredClone(activatedSaved));
    mem().index = structuredClone(index);
    notifyCloud(activatedSaved);
    return activatedSaved;
  }

  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(activatedSaved.id), activatedSaved);
    await tx.put('entities', INDEX_KEY, index);
  });
  notifyCloud(activatedSaved);
  return activatedSaved;
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
  const completedSaved = normalizeWeeklyPlan({
    ...completed,
    updatedAt: new Date().toISOString(),
  });
  if (index.activePlanId === planId) {
    index.activePlanId = null;
  }
  index.byWeekStart[completedSaved.weekStartDate] = completedSaved.id;

  const adapter = await getAdapter();
  if (!adapter) {
    mem().plans.set(completedSaved.id, structuredClone(completedSaved));
    mem().index = structuredClone(index);
    notifyCloud(completedSaved);
    return completedSaved;
  }

  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(completedSaved.id), completedSaved);
    await tx.put('entities', INDEX_KEY, index);
  });
  notifyCloud(completedSaved);
  return completedSaved;
}

export function __resetWeeklyPlanMemoryForTests(): void {
  memory = { index: emptyIndex(), plans: new Map() };
  adapterPromise = null;
}
