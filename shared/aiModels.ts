/** Server-approved OpenAI model allowlist for Path AI planning. */

export const DEFAULT_SERMON_PLAN_MODEL = 'gpt-4o-mini';
export const DEFAULT_TRAINING_PLAN_MODEL = 'gpt-4o-mini';

export const ALLOWED_SERMON_PLAN_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
] as const;

/** Same allowlist for training planning (kept as a named export for clarity). */
export const ALLOWED_TRAINING_PLAN_MODELS = ALLOWED_SERMON_PLAN_MODELS;

export type AllowedSermonPlanModel = (typeof ALLOWED_SERMON_PLAN_MODELS)[number];
export type AllowedTrainingPlanModel = AllowedSermonPlanModel;

export function isAllowedSermonPlanModel(model: string): model is AllowedSermonPlanModel {
  return (ALLOWED_SERMON_PLAN_MODELS as readonly string[]).includes(model);
}

export const isAllowedTrainingPlanModel = isAllowedSermonPlanModel;

export function resolveSermonPlanModel(
  requested?: string | null,
  envModel?: string | null,
): AllowedSermonPlanModel {
  if (requested && isAllowedSermonPlanModel(requested)) return requested;
  if (envModel && isAllowedSermonPlanModel(envModel)) return envModel;
  return DEFAULT_SERMON_PLAN_MODEL;
}

export function resolveTrainingPlanModel(
  requested?: string | null,
  envModel?: string | null,
): AllowedTrainingPlanModel {
  if (requested && isAllowedTrainingPlanModel(requested)) return requested;
  if (envModel && isAllowedTrainingPlanModel(envModel)) return envModel;
  return DEFAULT_TRAINING_PLAN_MODEL;
}
