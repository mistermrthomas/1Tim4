/**
 * Registry of account-scoped localStorage bags synced via path_account_bags.
 * These stores are device-global (not per profile id).
 */

export const ACCOUNT_BAG_KEYS = [
  'strength',
  'strength_rotation',
  'physical_tracker',
  'physical_plan',
  'walking',
  'mobility',
  'body',
  'travel',
  'work_training',
  'biblical_day',
  'day_completion',
  'tomorrow_readiness',
  'weekly_rhythm',
  'plan_config',
] as const;

export type AccountBagKey = (typeof ACCOUNT_BAG_KEYS)[number];

export const ACCOUNT_BAG_STORAGE_KEYS: Record<AccountBagKey, string> = {
  strength: 'path-strength-log-v1',
  strength_rotation: 'path-strength-rotation-v1',
  physical_tracker: 'path-physical-tracker-v1',
  physical_plan: 'path-physical-plan-v1',
  walking: 'path-walking-v1',
  mobility: 'path-mobility-v1',
  body: 'path-body-metrics-v1',
  travel: 'path-travel-v1',
  work_training: 'path-work-training-v1',
  biblical_day: 'path-biblical-day-v1',
  day_completion: 'path-day-completion-v1',
  tomorrow_readiness: 'path-tomorrow-readiness-v1',
  weekly_rhythm: 'path-weekly-rhythm-v1',
  plan_config: 'path-plan-config-v1',
};

export function readAccountBagPayload(bagKey: AccountBagKey): unknown | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_BAG_STORAGE_KEYS[bagKey]);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Write without notifying cloud (used when applying a cloud pull). */
export function writeAccountBagPayloadSilent(bagKey: AccountBagKey, payload: unknown): void {
  localStorage.setItem(ACCOUNT_BAG_STORAGE_KEYS[bagKey], JSON.stringify(payload));
}

export function isMeaningfulAccountBag(bagKey: AccountBagKey, payload: unknown): boolean {
  if (payload == null) return false;
  if (typeof payload !== 'object') return false;

  switch (bagKey) {
    case 'strength': {
      const s = payload as { entries?: unknown[]; workoutNotes?: unknown[] };
      return (s.entries?.length ?? 0) > 0 || (s.workoutNotes?.length ?? 0) > 0;
    }
    case 'strength_rotation': {
      const s = payload as { lastCompletedIndex?: number };
      return typeof s.lastCompletedIndex === 'number' && s.lastCompletedIndex >= 0;
    }
    case 'physical_tracker': {
      const s = payload as {
        sessions?: unknown[];
        intake?: unknown[];
        steps?: unknown[];
        dayMeta?: unknown[];
      };
      return (
        (s.sessions?.length ?? 0) > 0 ||
        (s.intake?.length ?? 0) > 0 ||
        (s.steps?.length ?? 0) > 0 ||
        (s.dayMeta?.length ?? 0) > 0
      );
    }
    case 'physical_plan': {
      const s = payload as { templates?: unknown[]; schedule?: unknown[] };
      return (s.templates?.length ?? 0) > 0 || (s.schedule?.length ?? 0) > 0;
    }
    case 'walking':
    case 'mobility':
    case 'body': {
      const s = payload as { entries?: unknown[] };
      return (s.entries?.length ?? 0) > 0;
    }
    case 'travel': {
      const s = payload as { trips?: unknown[] };
      return (s.trips?.length ?? 0) > 0;
    }
    case 'work_training': {
      const s = payload as { weeks?: unknown[] };
      return (s.weeks?.length ?? 0) > 0;
    }
    case 'biblical_day':
    case 'day_completion':
    case 'tomorrow_readiness': {
      return Object.keys(payload as object).length > 0;
    }
    case 'weekly_rhythm':
    case 'plan_config':
      return true;
    default:
      return false;
  }
}
