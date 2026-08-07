/**
 * AI training planning settings — IndexedDB (entities), not localStorage.
 * Separate from sermon AI planning settings. Never stores API keys.
 */

import {
  ALLOWED_TRAINING_PLAN_MODELS,
  DEFAULT_TRAINING_PLAN_MODEL,
  type AllowedTrainingPlanModel,
  isAllowedTrainingPlanModel,
} from '../../../shared/aiModels';
import {
  DEFAULT_TRAINING_PROMPT,
  DEFAULT_TRAINING_PROMPT_VERSION,
} from '../../../shared/defaultTrainingPrompt';
import { createIndexedDbAdapter } from '../../data/storage/indexedDbAdapter';
import type { StorageAdapter } from '../../data/storage/StorageAdapter';

const SETTINGS_KEY = 'aiTraining:settings';

export interface AiTrainingSettings {
  planningPrompt: string;
  promptVersion: string;
  model: AllowedTrainingPlanModel;
  updatedAt: string;
}

let memory: AiTrainingSettings | null = null;
let adapterPromise: Promise<StorageAdapter | null> | null = null;

export function defaultAiTrainingSettings(): AiTrainingSettings {
  return {
    planningPrompt: DEFAULT_TRAINING_PROMPT,
    promptVersion: DEFAULT_TRAINING_PROMPT_VERSION,
    model: DEFAULT_TRAINING_PLAN_MODEL,
    updatedAt: new Date().toISOString(),
  };
}

async function getAdapter(): Promise<StorageAdapter | null> {
  if (typeof indexedDB === 'undefined') return null;
  adapterPromise ??= Promise.resolve()
    .then(() => createIndexedDbAdapter())
    .catch(() => null);
  return adapterPromise;
}

export async function readAiTrainingSettings(): Promise<AiTrainingSettings> {
  const defaults = defaultAiTrainingSettings();
  const adapter = await getAdapter();
  if (!adapter) {
    memory ??= defaults;
    return structuredClone(memory);
  }
  const stored = await adapter.get<AiTrainingSettings>('entities', SETTINGS_KEY);
  if (!stored) return defaults;
  const model = isAllowedTrainingPlanModel(stored.model) ? stored.model : defaults.model;
  return {
    planningPrompt: stored.planningPrompt?.trim() || defaults.planningPrompt,
    promptVersion: stored.promptVersion || defaults.promptVersion,
    model,
    updatedAt: stored.updatedAt || defaults.updatedAt,
  };
}

export async function writeAiTrainingSettings(
  patch: Partial<AiTrainingSettings>,
): Promise<AiTrainingSettings> {
  const current = await readAiTrainingSettings();
  const next: AiTrainingSettings = {
    ...current,
    ...patch,
    model:
      patch.model && isAllowedTrainingPlanModel(patch.model) ? patch.model : current.model,
    planningPrompt:
      (patch.planningPrompt ?? current.planningPrompt).trim() || DEFAULT_TRAINING_PROMPT,
    updatedAt: new Date().toISOString(),
  };
  const adapter = await getAdapter();
  if (!adapter) {
    memory = structuredClone(next);
    return next;
  }
  await adapter.put('entities', SETTINGS_KEY, next);
  return next;
}

export async function resetAiTrainingPrompt(): Promise<AiTrainingSettings> {
  return writeAiTrainingSettings({
    planningPrompt: DEFAULT_TRAINING_PROMPT,
    promptVersion: DEFAULT_TRAINING_PROMPT_VERSION,
  });
}

export function isTrainingPromptModified(settings: AiTrainingSettings): boolean {
  return settings.planningPrompt.trim() !== DEFAULT_TRAINING_PROMPT.trim();
}

export {
  ALLOWED_TRAINING_PLAN_MODELS,
  DEFAULT_TRAINING_PROMPT,
  DEFAULT_TRAINING_PROMPT_VERSION,
};
