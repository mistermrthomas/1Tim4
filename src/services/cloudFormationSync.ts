/**
 * Cloud sync for weekly plans + church notes (IndexedDB → Supabase).
 * Separate from legacy trail sync in path_profile_trails.
 */

import { supabase } from '../lib/supabase';
import {
  exportChurchNotesSnapshot,
  importChurchNotesSnapshot,
  type ChurchNotesSnapshot,
} from '../domain/churchNotes/store';
import {
  exportWeeklyPlansSnapshot,
  importWeeklyPlansSnapshot,
  type WeeklyPlansSnapshot,
} from '../domain/weeklyPlan/store';

export interface FormationCloudPayload {
  version: 1;
  updatedAt: string;
  weeklyPlans: WeeklyPlansSnapshot;
  churchNotes: ChurchNotesSnapshot;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUserId: string | null = null;

function snapshotRevision(payload: FormationCloudPayload): number {
  let max = Date.parse(payload.updatedAt) || 0;
  for (const plan of payload.weeklyPlans.plans) {
    max = Math.max(max, Date.parse(plan.updatedAt) || 0);
  }
  for (const note of payload.churchNotes.notes) {
    max = Math.max(max, Date.parse(note.updatedAt) || 0);
  }
  for (const plan of payload.churchNotes.plans) {
    max = Math.max(max, Date.parse(plan.updatedAt) || 0);
  }
  return max;
}

function hasFormationContent(payload: FormationCloudPayload): boolean {
  return (
    payload.weeklyPlans.plans.some(
      (p) =>
        p.status === 'active' ||
        p.church.sermonNotes.trim().length > 0 ||
        p.biblical.weeklyTheme.trim().length > 0,
    ) ||
    payload.churchNotes.notes.some((n) => n.rawNotes.trim().length > 0) ||
    payload.churchNotes.plans.length > 0
  );
}

export async function buildLocalFormationPayload(): Promise<FormationCloudPayload> {
  const weeklyPlans = await exportWeeklyPlansSnapshot();
  const churchNotes = await exportChurchNotesSnapshot();
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    weeklyPlans,
    churchNotes,
  };
}

export async function pushFormationState(userId: string): Promise<string> {
  if (!supabase) return new Date().toISOString();
  const payload = await buildLocalFormationPayload();
  const now = new Date().toISOString();
  payload.updatedAt = now;

  const { data, error } = await supabase
    .from('path_user_formation_state')
    .upsert(
      {
        user_id: userId,
        payload,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();

  if (error) throw error;
  return (data?.updated_at as string) ?? now;
}

export async function fetchFormationState(
  userId: string,
): Promise<{ payload: FormationCloudPayload; updatedAt: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('path_user_formation_state')
    .select('payload, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.payload) return null;
  const payload = data.payload as FormationCloudPayload;
  if (payload.version !== 1) return null;
  return { payload, updatedAt: data.updated_at as string };
}

function mergeWeeklySnapshots(
  local: WeeklyPlansSnapshot,
  cloud: WeeklyPlansSnapshot,
): WeeklyPlansSnapshot {
  const byWeek = new Map<string, (typeof local.plans)[number]>();
  for (const plan of local.plans) byWeek.set(plan.weekStartDate, plan);
  for (const plan of cloud.plans) {
    const existing = byWeek.get(plan.weekStartDate);
    if (!existing || Date.parse(plan.updatedAt) >= Date.parse(existing.updatedAt)) {
      byWeek.set(plan.weekStartDate, plan);
    }
  }
  const plans = [...byWeek.values()];
  const byWeekStart: Record<string, string> = {};
  for (const plan of plans) byWeekStart[plan.weekStartDate] = plan.id;

  const localActive = local.plans.find((p) => p.id === local.index.activePlanId);
  const cloudActive = cloud.plans.find((p) => p.id === cloud.index.activePlanId);
  let activePlanId: string | null = null;
  if (localActive && cloudActive) {
    activePlanId =
      Date.parse(cloudActive.updatedAt) >= Date.parse(localActive.updatedAt)
        ? cloudActive.id
        : localActive.id;
  } else {
    activePlanId = cloudActive?.id ?? localActive?.id ?? null;
  }

  return {
    index: { version: 1, byWeekStart, activePlanId },
    plans,
  };
}

function mergeChurchSnapshots(
  local: ChurchNotesSnapshot,
  cloud: ChurchNotesSnapshot,
): ChurchNotesSnapshot {
  const notesById = new Map(local.notes.map((n) => [n.id, n]));
  for (const note of cloud.notes) {
    const existing = notesById.get(note.id);
    if (!existing || Date.parse(note.updatedAt) >= Date.parse(existing.updatedAt)) {
      notesById.set(note.id, note);
    }
  }
  const analysesById = new Map(local.analyses.map((a) => [a.id, a]));
  for (const analysis of cloud.analyses) {
    analysesById.set(analysis.id, analysis);
  }
  const plansById = new Map(local.plans.map((p) => [p.id, p]));
  for (const plan of cloud.plans) {
    const existing = plansById.get(plan.id);
    if (!existing || Date.parse(plan.updatedAt) >= Date.parse(existing.updatedAt)) {
      plansById.set(plan.id, plan);
    }
  }
  const notes = [...notesById.values()].sort((a, b) => b.sermonDate.localeCompare(a.sermonDate));
  const plans = [...plansById.values()];
  const active =
    plans.find((p) => p.active)?.id ??
    cloud.index.activeFormationPlanId ??
    local.index.activeFormationPlanId ??
    null;

  return {
    index: {
      version: 1,
      noteIds: notes.map((n) => n.id),
      activeFormationPlanId: active,
      formationPlanIds: plans.map((p) => p.id),
    },
    notes,
    analyses: [...analysesById.values()],
    plans,
  };
}

/**
 * Two-way merge of formation state on login.
 * Returns true when local IndexedDB was updated from cloud.
 */
export async function syncFormationStateOnLogin(userId: string): Promise<boolean> {
  const local = await buildLocalFormationPayload();
  const remote = await fetchFormationState(userId);

  if (!remote) {
    if (hasFormationContent(local)) {
      await pushFormationState(userId);
    }
    return false;
  }

  const localRev = snapshotRevision(local);
  const cloudRev = Math.max(Date.parse(remote.updatedAt) || 0, snapshotRevision(remote.payload));
  const localHas = hasFormationContent(local);
  const cloudHas = hasFormationContent(remote.payload);

  if (localHas && cloudHas) {
    const merged: FormationCloudPayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      weeklyPlans: mergeWeeklySnapshots(local.weeklyPlans, remote.payload.weeklyPlans),
      churchNotes: mergeChurchSnapshots(local.churchNotes, remote.payload.churchNotes),
    };
    await importWeeklyPlansSnapshot(merged.weeklyPlans);
    await importChurchNotesSnapshot(merged.churchNotes);
    await pushFormationState(userId);
    return true;
  }

  if (!localHas && cloudHas) {
    await importWeeklyPlansSnapshot(remote.payload.weeklyPlans);
    await importChurchNotesSnapshot(remote.payload.churchNotes);
    return true;
  }

  if (localHas && !cloudHas) {
    await pushFormationState(userId);
    return false;
  }

  // both empty or cloud newer empty — push if local newer
  if (localRev > cloudRev && localHas) {
    await pushFormationState(userId);
  }
  return false;
}

export function scheduleFormationStatePush(userId: string): void {
  if (!supabase) return;
  pendingUserId = userId;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const id = pendingUserId;
    pendingUserId = null;
    pushTimer = null;
    if (!id) return;
    void pushFormationState(id).catch((err) => {
      console.error('formation sync push failed', err instanceof Error ? err.message : err);
    });
  }, 900);
}
