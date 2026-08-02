/** User-editable physical plan: exercise library, templates, weekly schedule, targets. */

import { newId } from './store';
import type { PrescribedExercise, ResistanceUnit } from './types';

export const PHYSICAL_PLAN_KEY = 'path-physical-plan-v1';

export type EquipmentKind =
  | 'Bowflex Xtreme 2 SE'
  | '25 lb dumbbells'
  | 'Pilates reformer'
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

/** Keys '0'..'6' = Sunday..Saturday → template id or null (rest). */
export type WeekSchedule = Record<string, string | null>;

export interface PhysicalPlanCatalog {
  version: 1;
  exercises: CatalogExercise[];
  templates: CatalogTemplate[];
  weekSchedule: WeekSchedule;
  targets: PhysicalPlanTargets;
}

function ex(
  partial: Omit<CatalogExercise, 'defaultSets' | 'defaultReps' | 'cautionNote' | 'needsWorkingWeight' | 'notes' | 'muscleGroups'> &
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

function seedExercises(): CatalogExercise[] {
  return [
    ex({
      id: 'bowflex_chest_press',
      name: 'Chest Press',
      equipment: 'Bowflex Xtreme 2 SE',
      muscleGroups: ['chest', 'triceps'],
      defaultLoad: 155,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '12',
      notes: 'Bowflex resistance (not free-weight equivalent).',
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
      notes: 'Bowflex resistance.',
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
      cautionNote: 'Shoulder caution — mild left-shoulder discomfort; stop if irritated.',
      notes: 'Most recent: 2×12. Prefer caution over progression.',
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
      notes: 'Bowflex resistance. Prior working prescription.',
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
      notes: 'Bowflex resistance.',
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
      notes: 'Bowflex resistance.',
    }),
    ex({
      id: 'bodyweight_squat',
      name: 'Bodyweight Squat',
      equipment: 'Bodyweight',
      muscleGroups: ['legs'],
      defaultLoad: null,
      defaultLoadUnit: 'bw',
      defaultSets: 3,
      defaultReps: '8-10',
      notes: 'Editable default prescription.',
    }),
    ex({
      id: 'db_needs_weight',
      name: 'Dumbbell exercise',
      equipment: '25 lb dumbbells',
      muscleGroups: [],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '10',
      needsWorkingWeight: true,
      notes: 'Rename and set an initial working weight before assigning.',
    }),
    ex({
      id: 'reformer_needs_weight',
      name: 'Reformer exercise',
      equipment: 'Pilates reformer',
      muscleGroups: [],
      defaultLoad: null,
      defaultLoadUnit: 'lb',
      defaultSets: 3,
      defaultReps: '10',
      needsWorkingWeight: true,
      notes: 'Rename and set spring/resistance before assigning. No invented load.',
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
    {
      id: 'tmpl_lower_body',
      name: 'Lower Body',
      exercises: [item('bodyweight_squat', exercises, { order: 0 })],
    },
    {
      id: 'tmpl_full_body',
      name: 'Full Body',
      exercises: [item('bodyweight_squat', exercises, { order: 0 })],
    },
    { id: 'tmpl_conditioning', name: 'Conditioning / Recovery', exercises: [] },
  ];
}

function seedSchedule(): WeekSchedule {
  return {
    '0': null,
    '1': 'tmpl_chest_triceps',
    '2': 'tmpl_back_biceps',
    '3': 'tmpl_lower_body',
    '4': 'tmpl_full_body',
    '5': 'tmpl_chest_triceps',
    '6': 'tmpl_chest_triceps',
  };
}

export function buildDefaultPhysicalPlan(): PhysicalPlanCatalog {
  const exercises = seedExercises();
  return {
    version: 1,
    exercises,
    templates: seedTemplates(exercises),
    weekSchedule: seedSchedule(),
    targets: {
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
    },
  };
}

function mergeExercises(
  stored: CatalogExercise[] | undefined,
  defaults: CatalogExercise[],
): CatalogExercise[] {
  if (!stored?.length) return defaults;
  const byId = new Map<string, CatalogExercise>();
  for (const item of defaults) byId.set(item.id, item);
  for (const item of stored) byId.set(item.id, { ...(byId.get(item.id) ?? item), ...item });
  // Keep default order first, then any user-added ids.
  const ordered: CatalogExercise[] = [];
  const seen = new Set<string>();
  for (const item of defaults) {
    ordered.push(byId.get(item.id)!);
    seen.add(item.id);
  }
  for (const item of stored) {
    if (seen.has(item.id)) continue;
    ordered.push(byId.get(item.id)!);
    seen.add(item.id);
  }
  return ordered;
}

function mergeWithDefaults(parsed: Partial<PhysicalPlanCatalog>): PhysicalPlanCatalog {
  const defaults = buildDefaultPhysicalPlan();
  return {
    version: 1,
    exercises: mergeExercises(parsed.exercises, defaults.exercises),
    templates: parsed.templates?.length ? parsed.templates : defaults.templates,
    weekSchedule: { ...defaults.weekSchedule, ...(parsed.weekSchedule ?? {}) },
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
    return mergeWithDefaults(JSON.parse(raw) as Partial<PhysicalPlanCatalog>);
  } catch {
    return buildDefaultPhysicalPlan();
  }
}

export function writePhysicalPlan(plan: PhysicalPlanCatalog): void {
  localStorage.setItem(PHYSICAL_PLAN_KEY, JSON.stringify(plan));
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
    exercises: ordered.map((item) => {
      const lib = plan.exercises.find((e) => e.id === item.exerciseId);
      return {
        exerciseId: item.exerciseId,
        name: lib?.name ?? item.exerciseId,
        equipment: lib?.equipment ?? 'none',
        sets: item.sets,
        reps: item.reps,
        load: item.load,
        loadUnit: item.loadUnit,
        cautionNote: item.cautionNote || lib?.cautionNote || '',
        note: item.note || lib?.notes || '',
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
