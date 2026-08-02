/**
 * One-time / explicit purge of known demo records.
 * Preserves the seeded exercise catalog and does not wipe IndexedDB wholesale.
 */

import { clearPlanConfig, PLAN_CONFIG_STORAGE_KEY } from '../training/activePlan';
import {
  CATALOG_SEED_VERSION,
  DEMO_PACK_EXERCISE_IDS,
  DEMO_PACK_SESSION_IDS,
  DEMO_PLACEHOLDER_EXERCISE_IDS,
  DEMO_PURGE_FLAG_KEY,
} from './demoIds';
import {
  buildDefaultPhysicalPlan,
  emptyWeekSchedule,
  migratePhysicalPlanCatalog,
  PHYSICAL_PLAN_KEY,
  readPhysicalPlan,
  writePhysicalPlan,
} from '../physical/planCatalog';
import { readPhysicalTracker, writePhysicalTracker } from '../physical/store';
import { listWeeklyPlans, saveWeeklyPlan } from '../weeklyPlan/store';

function isDemoSession(session: {
  templateSessionId: string;
  templateId: string;
  workoutName: string;
  exercises: Array<{ exerciseId: string }>;
  status: string;
  startedAt: string | null;
}): boolean {
  if (DEMO_PACK_SESSION_IDS.has(session.templateSessionId)) return true;
  if (session.templateId.startsWith('full_body_foundations')) return true;
  if (/full body a/i.test(session.workoutName)) return true;
  const ids = session.exercises.map((e) => e.exerciseId);
  const looksLikeSampleFullBody =
    ids.length > 0 &&
    ids.every(
      (id) =>
        DEMO_PACK_EXERCISE_IDS.has(id) ||
        id.includes('bodyweight_squat') ||
        id.includes('push') ||
        id.includes('hip_hinge'),
    );
  // Only remove untouched sample sessions — never wipe a real in-progress/completed workout.
  if (looksLikeSampleFullBody && session.status === 'scheduled' && !session.startedAt) return true;
  return false;
}

/** Clear demo workout sessions from the tracker; keep intake/steps. */
export function purgeDemoWorkoutSessions(): number {
  const state = readPhysicalTracker();
  const before = state.sessions.length;
  state.sessions = state.sessions.filter((s) => !isDemoSession(s));
  writePhysicalTracker(state);
  return before - state.sessions.length;
}

/**
 * Reset schedule to empty and refresh catalog seed, preserving user load edits
 * via migratePhysicalPlanCatalog merge rules.
 */
export function purgeDemoPhysicalSchedule(): void {
  const migrated = migratePhysicalPlanCatalog(readPhysicalPlan());
  writePhysicalPlan({
    ...migrated,
    weekSchedule: emptyWeekSchedule(),
    catalogSeedVersion: CATALOG_SEED_VERSION,
  });
}

/** Remove Patience-derived plan config overrides. */
export function purgeDemoPlanConfig(): void {
  try {
    clearPlanConfig();
    localStorage.removeItem(PLAN_CONFIG_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Soft-archive weekly plans that still carry the old demo biblical theme
 * and were never meaningfully edited — only when status is draft and theme matches.
 */
export async function purgeDemoWeeklyPlanDrafts(): Promise<number> {
  let removed = 0;
  try {
    const plans = await listWeeklyPlans();
    for (const plan of plans) {
      const isDemoTheme =
        /patience under pressure/i.test(plan.biblical.weeklyTheme) ||
        /matthew 5:38/i.test(plan.biblical.coreScripture);
      if (plan.status === 'draft' && isDemoTheme && !plan.church.sermonNotes.trim()) {
        await saveWeeklyPlan({ ...plan, status: 'archived' });
        removed += 1;
      }
    }
  } catch {
    /* IndexedDB unavailable */
  }
  return removed;
}

/** Run once per browser (flagged) on app boot. */
export async function runDemoPurgeIfNeeded(): Promise<void> {
  try {
    if (localStorage.getItem(DEMO_PURGE_FLAG_KEY) === 'done') {
      // Still ensure catalog migration runs (idempotent).
      writePhysicalPlan(migratePhysicalPlanCatalog(readPhysicalPlan()));
      return;
    }
  } catch {
    return;
  }

  await resetDemoData({ fullReset: false });
  try {
    localStorage.setItem(DEMO_PURGE_FLAG_KEY, 'done');
  } catch {
    /* ignore */
  }
}

export interface ResetDemoOptions {
  /** When true, also clears active weekly plans and rewrites catalog from seed. */
  fullReset?: boolean;
}

/**
 * Explicit “Reset Demo Data” action.
 * Default: remove known demo records, empty schedule, keep catalog + user health logs.
 * fullReset: also wipe physical plan key and recreate catalog seed (still keeps intake/steps).
 */
export async function resetDemoData(options: ResetDemoOptions = {}): Promise<{
  sessionsRemoved: number;
  draftsArchived: number;
}> {
  const sessionsRemoved = purgeDemoWorkoutSessions();
  purgeDemoPlanConfig();

  if (options.fullReset) {
    const seeded = buildDefaultPhysicalPlan();
    localStorage.setItem(PHYSICAL_PLAN_KEY, JSON.stringify(seeded));
  } else {
    purgeDemoPhysicalSchedule();
  }

  const draftsArchived = await purgeDemoWeeklyPlanDrafts();
  return { sessionsRemoved, draftsArchived };
}

/** Dev helper: strip placeholder exercise rows left from older seeds. */
export function stripPlaceholderExercises(): void {
  const plan = readPhysicalPlan();
  plan.exercises = plan.exercises.filter((e) => !DEMO_PLACEHOLDER_EXERCISE_IDS.has(e.id));
  writePhysicalPlan(plan);
}
