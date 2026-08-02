/** Server-approved OpenAI model allowlist for sermon planning. */

export const DEFAULT_SERMON_PLAN_MODEL = 'gpt-4o-mini';

export const ALLOWED_SERMON_PLAN_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
] as const;

export type AllowedSermonPlanModel = (typeof ALLOWED_SERMON_PLAN_MODELS)[number];

export function isAllowedSermonPlanModel(model: string): model is AllowedSermonPlanModel {
  return (ALLOWED_SERMON_PLAN_MODELS as readonly string[]).includes(model);
}

export function resolveSermonPlanModel(
  requested?: string | null,
  envModel?: string | null,
): AllowedSermonPlanModel {
  if (requested && isAllowedSermonPlanModel(requested)) return requested;
  if (envModel && isAllowedSermonPlanModel(envModel)) return envModel;
  return DEFAULT_SERMON_PLAN_MODEL;
}
