/** User-editable physical plan: exercise library, templates, weekly schedule, targets. */

import { CATALOG_SEED_VERSION } from '../demo/demoIds';
import { newId } from './store';
import type { PrescribedExercise, ResistanceUnit } from './types';

export const PHYSICAL_PLAN_KEY = 'path-physical-plan-v1';

export type EquipmentKind =
  | 'Bowflex Xtreme 2 SE'
  | '25 lb dumbbells'
  | 'Pilates Reformer'
  | 'Mobility'
  | 'Recovery'
  | 'Bodyweight'
  | string;

export interface CatalogExercise {
  id: string;
  name: string;
  equipment: EquipmentKind;
  muscleGroups: string[];
  defaultLoad: number | null;
  defaultLoadUnit: ResistanceUnit;
  defaultSets: number;
  defaultReps: string;
  cautionNote: string;
  needsWorkingWeight: boolean;
  notes: string;
  /** Soft flag — planning UI should not auto-schedule these. */
  avoidAutoSchedule?: boolean;
  useCautiously?: boolean;
}

export interface CatalogTemplateExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  load: number | null;
  loadUnit: ResistanceUnit;
  note: string;
  cautionNote: string;
  order: number;
}

export interface CatalogTemplate {
  id: string;
  name: string;
  exercises: CatalogTemplateExercise[];
}

export interface PhysicalPlanTargets {
  steps: number;
  proteinG: number;
  waterOz: number;
  waterUnit: 'oz' | 'ml' | 'L';
  recoveryEnabled: boolean;
  recoveryLabel: string;
  stepsSource: 'manual' | 'synced';
  proteinQuickAdds: number[];
  waterQuickAddsOz: number[];
  waterQuickAddsMl: number[];
}

/** Keys '0'..'6' = Sunday..Saturday → template id or null (rest / unscheduled). */
export type WeekSchedule = Record<string, string | null>;

export interface PhysicalPlanCatalog {
  version: 1;
  /** Bumped when the seeded library changes; drives one-time migrations. */
  catalogSeedVersion: number;
  exercises: CatalogExercise[];
  templates: CatalogTemplate[];
  weekSchedule: WeekSchedule;
  targets: PhysicalPlanTargets;
}

const SHOULDER_NOTE =
  'Shoulder caution (personal history, not a diagnosis): mild discomfort near the top of the left shoulder has occurred. Incline pressing previously irritated the shoulder and was stopped after two sets. Shoulder-isolation work commonly irritates it. Do not auto-increase resistance on incline pressing. Use cautiously.';

function ex(
  partial: Omit<
    CatalogExercise,
    | 'defaultSets'
    | 'defaultReps'
    | 'cautionNote'
    | 'needsWorkingWeight'
    | 'notes'
    | 'muscleGroups'
  > &
    Partial<CatalogExercise>,
): CatalogExercise {
  return {
    muscleGroups: [],
    defaultSets: 3,
    defaultReps: '12',
    cautionNote: '',
    needsWorkingWeight: false,
    notes: '',
    ...partial,
  };
}

export function emptyWeekSchedule(): WeekSchedule {
  return {
    '0': null,
    '1': null,
    '2': null,
    '3': null,
    '4': null,
    '5': null,
    '6': null,
  };
}

function seedExercises(): CatalogExercise[] {
  return [
    // —— Bowflex Xtreme 2 SE · Chest ——
    ex({
      id: 'bowflex_chest_press',
      name: 'Chest Press',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['chest', 'triceps'],
      defaultLoad: 155,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '12',
      notes: 'Last used: Bowflex 155 lb · 3×12. Editable working weight.',
    }),
    ex({
      id: 'bowflex_incline_chest_press',
      name: 'Incline Chest Press',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['chest', 'shoulders', 'triceps'],
      defaultLoad: 155,
      defaultLoadUnit: 'lb',
      defaultSets: 2,
      defaultReps: '12',
      cautionNote: SHOULDER_NOTE,
      useCautiously: true,
      notes: 'Last used: Bowflex 155 lb · 2×12 (stopped early). Use cautiously — do not auto-increase load.',
    }),
    ex({
      id: 'bowflex_decline_chest_press',
      name: 'Decline Chest Press',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['chest', 'triceps'],
      defaultLoad: 155,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '12',
      notes: 'Last used: Bowflex 155 lb · 3×12.',
    }),
    ex({
      id: 'bowflex_chest_fly',
      name: 'Chest Fly',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['chest'],
      defaultLoad: 155,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '12',
      notes: 'Last used: Bowflex 155 lb · 3×12.',
    }),

    // —— Back ——
    ex({
      id: 'bowflex_lat_pulldown',
      name: 'Lat Pulldown',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['back', 'biceps'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_seated_row',
      name: 'Seated Row',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['back', 'biceps'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_reverse_fly',
      name: 'Reverse Fly / Rear Deltoid Row',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['back', 'shoulders'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      cautionNote: SHOULDER_NOTE,
      useCautiously: true,
      avoidAutoSchedule: true,
      needsWorkingWeight: true,
      notes: 'Shoulder-isolation tendency — do not auto-schedule.',
    }),
    ex({
      id: 'bowflex_low_back_extension',
      name: 'Low Back Extension',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['back'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_shoulder_pullover',
      name: 'Shoulder Pullover',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['back', 'chest'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      cautionNote: SHOULDER_NOTE,
      useCautiously: true,
      needsWorkingWeight: true,
    }),

    // —— Arms ——
    ex({
      id: 'bowflex_biceps_curl',
      name: 'Biceps Curl',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['biceps'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_reverse_curl',
      name: 'Reverse Curl',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['biceps', 'forearms'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_triceps_pushdown',
      name: 'Triceps Pushdown',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['triceps'],
      defaultLoad: 110,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '12',
      notes: 'Last used: Bowflex 110 lb · 3×12.',
    }),
    ex({
      id: 'bowflex_oh_rope_triceps',
      name: 'Overhead Rope Triceps Extension',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['triceps'],
      defaultLoad: 110,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '12',
      notes: 'Last used: Bowflex 110 lb · 3×12.',
    }),
    ex({
      id: 'bowflex_seated_triceps_extension',
      name: 'Seated Triceps Extension',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['triceps'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),

    // —— Lower body ——
    ex({
      id: 'bowflex_squat',
      name: 'Squat',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['legs', 'glutes'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_leg_extension',
      name: 'Leg Extension',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['legs'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_leg_curl',
      name: 'Leg Curl',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['legs'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_calf_raise',
      name: 'Standing or Seated Calf Raise',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['calves'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_glute_kickback',
      name: 'Glute Kickback',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['glutes'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_hip_abduction',
      name: 'Seated Hip Abduction',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['hips'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),
    ex({
      id: 'bowflex_hip_adduction',
      name: 'Seated Hip Adduction',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['hips'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),

    // —— Core ——
    ex({
      id: 'bowflex_abdominal_crunch',
      name: 'Abdominal Crunch',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['core'],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
    }),

    // —— Dumbbells (pair of 25 lb) ——
    ex({
      id: 'db_deadlift',
      name: 'Dumbbell Deadlift',
      equipment: '25 lb dumbbells',
      muscleGroups: ['posterior', 'legs'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
      notes: 'Available equipment: pair of 25 lb dumbbells.',
    }),
    ex({
      id: 'db_goblet_squat',
      name: 'Goblet Squat',
      equipment: '25 lb dumbbells',
      muscleGroups: ['legs', 'glutes'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
    }),
    ex({
      id: 'db_fly',
      name: 'Dumbbell Fly',
      equipment: '25 lb dumbbells',
      muscleGroups: ['chest'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
    }),
    ex({
      id: 'db_hammer_curl',
      name: 'Hammer Curl',
      equipment: '25 lb dumbbells',
      muscleGroups: ['biceps'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
    }),
    ex({
      id: 'db_curl',
      name: 'Dumbbell Curl',
      equipment: '25 lb dumbbells',
      muscleGroups: ['biceps'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
    }),
    ex({
      id: 'db_shrug',
      name: 'Dumbbell Shrug',
      equipment: '25 lb dumbbells',
      muscleGroups: ['traps'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
      cautionNote: SHOULDER_NOTE,
      useCautiously: true,
    }),
    ex({
      id: 'db_weighted_situp',
      name: 'Weighted Sit-Up',
      equipment: '25 lb dumbbells',
      muscleGroups: ['core'],
      defaultLoad: 25,
      defaultLoadUnit: 'lb',
      defaultReps: '10',
    }),

    // —— Bodyweight (catalog only — not auto-scheduled) ——
    ex({
      id: 'bw_squat',
      name: 'Bodyweight Squat',
      equipment: 'Bodyweight',
      muscleGroups: ['legs'],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      defaultReps: '10',
    }),
    ex({
      id: 'bw_pushup',
      name: 'Push-Up',
      equipment: 'Bodyweight',
      muscleGroups: ['chest', 'triceps'],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      defaultReps: '8-12',
    }),
    ex({
      id: 'bw_plank',
      name: 'Plank',
      equipment: 'Bodyweight',
      muscleGroups: ['core'],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      defaultReps: '30-60s',
    }),
    ex({
      id: 'bw_hip_hinge',
      name: 'Standing Hip Hinge',
      equipment: 'Bodyweight',
      muscleGroups: ['posterior'],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      defaultReps: '8-10',
    }),

    // —— Pilates / Mobility / Recovery (structure only) ——
    ex({
      id: 'pilates_placeholder',
      name: 'Pilates Reformer (add exercises later)',
      equipment: 'Pilates Reformer',
      muscleGroups: [],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      needsWorkingWeight: true,
      avoidAutoSchedule: true,
      notes: 'Category placeholder — not assigned automatically.',
    }),
    ex({
      id: 'mobility_placeholder',
      name: 'Mobility work (add exercises later)',
      equipment: 'Mobility',
      muscleGroups: [],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      avoidAutoSchedule: true,
      notes: 'Category placeholder — not assigned automatically.',
    }),
    ex({
      id: 'recovery_placeholder',
      name: 'Recovery / easy movement (add later)',
      equipment: 'Recovery',
      muscleGroups: [],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      avoidAutoSchedule: true,
      notes: 'Category placeholder — not assigned automatically.',
    }),
  ];
}

function item(
  exerciseId: string,
  catalog: CatalogExercise[],
  overrides: Partial<CatalogTemplateExercise> = {},
): CatalogTemplateExercise {
  const base = catalog.find((e) => e.id === exerciseId)!;
  return {
    exerciseId,
    sets: base.defaultSets,
    reps: base.defaultReps,
    load: base.defaultLoad,
    loadUnit: base.defaultLoadUnit,
    note: base.notes,
    cautionNote: base.cautionNote,
    order: 0,
    ...overrides,
  };
}

/**
 * Named templates available for weekly planning.
 * Chest and Triceps is pre-filled from known Bowflex work — never auto-scheduled.
 */
function seedTemplates(exercises: CatalogExercise[]): CatalogTemplate[] {
  const chestItems = [
    'bowflex_chest_press',
    'bowflex_decline_chest_press',
    'bowflex_chest_fly',
    'bowflex_triceps_pushdown',
    'bowflex_oh_rope_triceps',
  ].map((id, order) => item(id, exercises, { order }));

  return [
    { id: 'tmpl_chest_triceps', name: 'Chest and Triceps', exercises: chestItems },
    { id: 'tmpl_back_biceps', name: 'Back and Biceps', exercises: [] },
    { id: 'tmpl_lower_body', name: 'Lower Body', exercises: [] },
    { id: 'tmpl_full_body', name: 'Full Body', exercises: [] },
    { id: 'tmpl_recovery', name: 'Recovery', exercises: [] },
  ];
}

function defaultTargets(): PhysicalPlanTargets {
  return {
    steps: 8000,
    proteinG: 120,
    waterOz: 80,
    waterUnit: 'oz',
    recoveryEnabled: false,
    recoveryLabel: 'Protect bedtime',
    stepsSource: 'manual',
    proteinQuickAdds: [1, 5, 10, 20],
    waterQuickAddsOz: [1, 5, 10, 16],
    waterQuickAddsMl: [50, 100, 250, 500],
  };
}

export function buildDefaultPhysicalPlan(): PhysicalPlanCatalog {
  const exercises = seedExercises();
  return {
    version: 1,
    catalogSeedVersion: CATALOG_SEED_VERSION,
    exercises,
    templates: seedTemplates(exercises),
    weekSchedule: emptyWeekSchedule(),
    targets: defaultTargets(),
  };
}

function mergeExercises(
  stored: CatalogExercise[] | undefined,
  defaults: CatalogExercise[],
): CatalogExercise[] {
  if (!stored?.length) return defaults;
  const byId = new Map<string, CatalogExercise>();
  for (const item of defaults) byId.set(item.id, item);
  for (const item of stored) {
    const base = byId.get(item.id);
    // Prefer stored working loads; keep seed caution metadata when stored is empty.
    byId.set(item.id, {
      ...(base ?? item),
      ...item,
      cautionNote: item.cautionNote || base?.cautionNote || '',
      notes: item.notes || base?.notes || '',
      useCautiously: item.useCautiously ?? base?.useCautiously,
      avoidAutoSchedule: item.avoidAutoSchedule ?? base?.avoidAutoSchedule,
    });
  }
  const ordered: CatalogExercise[] = [];
  const seen = new Set<string>();
  for (const item of defaults) {
    ordered.push(byId.get(item.id)!);
    seen.add(item.id);
  }
  for (const item of stored) {
    if (seen.has(item.id)) continue;
    // Drop obsolete placeholder rows
    if (item.id === 'db_needs_weight' || item.id === 'reformer_needs_weight') continue;
    if (item.id === 'bodyweight_squat') continue; // renamed to bw_squat
    ordered.push(byId.get(item.id)!);
    seen.add(item.id);
  }
  return ordered;
}

function mergeTemplates(
  stored: CatalogTemplate[] | undefined,
  defaults: CatalogTemplate[],
): CatalogTemplate[] {
  if (!stored?.length) return defaults;
  const byId = new Map(defaults.map((t) => [t.id, t]));
  for (const t of stored) {
    const def = byId.get(t.id);
    // Keep user-edited templates; if they still only hold the old bodyweight_squat demo, replace.
    if (
      def &&
      t.exercises.length === 1 &&
      (t.exercises[0]?.exerciseId === 'bodyweight_squat' ||
        t.exercises[0]?.exerciseId === 'bw_squat') &&
      (t.id === 'tmpl_full_body' || t.id === 'tmpl_lower_body')
    ) {
      byId.set(t.id, def);
      continue;
    }
    byId.set(t.id, t);
  }
  // Ensure Recovery template exists (renamed from Conditioning)
  if (!byId.has('tmpl_recovery') && byId.has('tmpl_conditioning')) {
    const old = byId.get('tmpl_conditioning')!;
    byId.set('tmpl_recovery', { ...old, id: 'tmpl_recovery', name: 'Recovery' });
    byId.delete('tmpl_conditioning');
  }
  const order = ['tmpl_chest_triceps', 'tmpl_back_biceps', 'tmpl_lower_body', 'tmpl_full_body', 'tmpl_recovery'];
  const ordered: CatalogTemplate[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const t = byId.get(id);
    if (t) {
      ordered.push(t);
      seen.add(id);
    }
  }
  for (const t of byId.values()) {
    if (!seen.has(t.id)) ordered.push(t);
  }
  return ordered;
}

/** Upgrade stored plan to current catalog seed without inventing a schedule. */
export function migratePhysicalPlanCatalog(
  parsed: Partial<PhysicalPlanCatalog> & { weekSchedule?: WeekSchedule },
): PhysicalPlanCatalog {
  const defaults = buildDefaultPhysicalPlan();
  const priorVersion = parsed.catalogSeedVersion ?? 1;
  const templates = mergeTemplates(parsed.templates, defaults.templates);

  let weekSchedule = emptyWeekSchedule();
  if (priorVersion >= CATALOG_SEED_VERSION && parsed.weekSchedule) {
    // After clean seed, preserve user/weekly-plan schedules.
    weekSchedule = { ...emptyWeekSchedule(), ...parsed.weekSchedule };
  }
  // priorVersion < 2: drop demo Mon–Sat assignments intentionally.

  return {
    version: 1,
    catalogSeedVersion: CATALOG_SEED_VERSION,
    exercises: mergeExercises(parsed.exercises, defaults.exercises),
    templates,
    weekSchedule,
    targets: { ...defaults.targets, ...(parsed.targets ?? {}) },
  };
}

export function readPhysicalPlan(): PhysicalPlanCatalog {
  try {
    const raw = localStorage.getItem(PHYSICAL_PLAN_KEY);
    if (!raw) {
      const seeded = buildDefaultPhysicalPlan();
      localStorage.setItem(PHYSICAL_PLAN_KEY, JSON.stringify(seeded));
      return structuredClone(seeded);
    }
    const parsed = JSON.parse(raw) as Partial<PhysicalPlanCatalog>;
    const migrated = migratePhysicalPlanCatalog(parsed);
    if (
      parsed.catalogSeedVersion !== migrated.catalogSeedVersion ||
      (parsed.exercises?.length ?? 0) < migrated.exercises.length
    ) {
      localStorage.setItem(PHYSICAL_PLAN_KEY, JSON.stringify(migrated));
    }
    return structuredClone(migrated);
  } catch {
    return buildDefaultPhysicalPlan();
  }
}

export function writePhysicalPlan(plan: PhysicalPlanCatalog): void {
  localStorage.setItem(
    PHYSICAL_PLAN_KEY,
    JSON.stringify({ ...plan, catalogSeedVersion: plan.catalogSeedVersion ?? CATALOG_SEED_VERSION }),
  );
}

export function resetPhysicalPlan(): PhysicalPlanCatalog {
  const seeded = buildDefaultPhysicalPlan();
  writePhysicalPlan(seeded);
  return structuredClone(seeded);
}

export function weekdayKey(date = new Date()): string {
  return String(date.getDay());
}

export function resolveTodaysPrescription(
  date = new Date(),
): {
  templateId: string;
  templateSessionId: string;
  workoutName: string;
  exercises: Array<PrescribedExercise & { cautionNote: string; note: string }>;
} | null {
  const plan = readPhysicalPlan();
  const templateId = plan.weekSchedule[weekdayKey(date)] ?? null;
  if (!templateId) return null;

  const template = plan.templates.find((t) => t.id === templateId);
  if (!template || template.exercises.length === 0) return null;

  const ordered = [...template.exercises].sort((a, b) => a.order - b.order);
  return {
    templateId: template.id,
    templateSessionId: `${template.id}.session`,
    workoutName: template.name,
    exercises: ordered.map((row) => {
      const lib = plan.exercises.find((e) => e.id === row.exerciseId);
      return {
        exerciseId: row.exerciseId,
        name: lib?.name ?? row.exerciseId,
        equipment: lib?.equipment ?? 'none',
        sets: row.sets,
        reps: row.reps,
        load: row.load,
        loadUnit: row.loadUnit,
        cautionNote: row.cautionNote || lib?.cautionNote || '',
        note: row.note || lib?.notes || '',
      };
    }),
  };
}

export function addCatalogExercise(
  draft: Omit<CatalogExercise, 'id'> & { id?: string },
): CatalogExercise {
  const plan = readPhysicalPlan();
  const exercise: CatalogExercise = {
    ...draft,
    id: draft.id ?? newId('exlib'),
  };
  plan.exercises.push(exercise);
  writePhysicalPlan(plan);
  return exercise;
}

export function updateCatalogExercise(id: string, patch: Partial<CatalogExercise>): void {
  const plan = readPhysicalPlan();
  const index = plan.exercises.findIndex((e) => e.id === id);
  if (index < 0) return;
  plan.exercises[index] = { ...plan.exercises[index]!, ...patch, id };
  writePhysicalPlan(plan);
}

export function removeCatalogExercise(id: string): void {
  const plan = readPhysicalPlan();
  plan.exercises = plan.exercises.filter((e) => e.id !== id);
  for (const template of plan.templates) {
    template.exercises = template.exercises.filter((e) => e.exerciseId !== id);
  }
  writePhysicalPlan(plan);
}

export function upsertTemplate(template: CatalogTemplate): void {
  const plan = readPhysicalPlan();
  const index = plan.templates.findIndex((t) => t.id === template.id);
  if (index >= 0) plan.templates[index] = template;
  else plan.templates.push(template);
  writePhysicalPlan(plan);
}

export function duplicateTemplate(templateId: string): CatalogTemplate | null {
  const plan = readPhysicalPlan();
  const source = plan.templates.find((t) => t.id === templateId);
  if (!source) return null;
  const copy: CatalogTemplate = {
    ...structuredClone(source),
    id: newId('tmpl'),
    name: `${source.name} (copy)`,
  };
  plan.templates.push(copy);
  writePhysicalPlan(plan);
  return copy;
}

export function setWeekdayTemplate(weekday: string, templateId: string | null): void {
  const plan = readPhysicalPlan();
  plan.weekSchedule[weekday] = templateId;
  writePhysicalPlan(plan);
}

export function updatePlanTargets(patch: Partial<PhysicalPlanTargets>): PhysicalPlanTargets {
  const plan = readPhysicalPlan();
  plan.targets = { ...plan.targets, ...patch };
  writePhysicalPlan(plan);
  return plan.targets;
}
