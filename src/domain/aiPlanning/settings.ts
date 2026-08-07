/**
 * AI planning settings — IndexedDB (entities), not localStorage.
 * Never stores API keys.
 */

import { createIndexedDbAdapter } from '../../data/storage/indexedDbAdapter';
import type { StorageAdapter } from '../../data/storage/StorageAdapter';
import {
  ALLOWED_SERMON_PLAN_MODELS,
  DEFAULT_SERMON_PLAN_MODEL,
  type AllowedSermonPlanModel,
  isAllowedSermonPlanModel,
} from '../../../shared/aiModels';
import {
  DEFAULT_PLANNING_PROMPT,
  DEFAULT_PLANNING_PROMPT_VERSION,
} from '../../../shared/defaultPlanningPrompt';

const SETTINGS_KEY = 'aiPlanning:settings';

export interface AiPlanningSettings {
  planningPrompt: string;
  /** Prompt content version the user last accepted as baseline */
  promptVersion: string;
  model: AllowedSermonPlanModel;
  updatedAt: string;
}

let memory: AiPlanningSettings | null = null;
let adapterPromise: Promise<StorageAdapter | null> | null = null;

export function defaultAiPlanningSettings(): AiPlanningSettings {
  return {
    planningPrompt: DEFAULT_PLANNING_PROMPT,
    promptVersion: DEFAULT_PLANNING_PROMPT_VERSION,
    model: DEFAULT_SERMON_PLAN_MODEL,
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

export async function readAiPlanningSettings(): Promise<AiPlanningSettings> {
  const defaults = defaultAiPlanningSettings();
  const adapter = await getAdapter();
  if (!adapter) {
    memory ??= defaults;
    return structuredClone(memory);
  }
  const stored = await adapter.get<AiPlanningSettings>('entities', SETTINGS_KEY);
  if (!stored) return defaults;
  const model = isAllowedSermonPlanModel(stored.model) ? stored.model : defaults.model;
  return {
    planningPrompt: stored.planningPrompt?.trim() || defaults.planningPrompt,
    promptVersion: stored.promptVersion || defaults.promptVersion,
    model,
    updatedAt: stored.updatedAt || defaults.updatedAt,
  };
}

export async function writeAiPlanningSettings(
  patch: Partial<AiPlanningSettings>,
): Promise<AiPlanningSettings> {
  const current = await readAiPlanningSettings();
  const next: AiPlanningSettings = {
    ...current,
    ...patch,
    model:
      patch.model && isAllowedSermonPlanModel(patch.model) ? patch.model : current.model,
    planningPrompt: (patch.planningPrompt ?? current.planningPrompt).trim() || DEFAULT_PLANNING_PROMPT,
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

export async function resetAiPlanningPrompt(): Promise<AiPlanningSettings> {
  return writeAiPlanningSettings({
    planningPrompt: DEFAULT_PLANNING_PROMPT,
    promptVersion: DEFAULT_PLANNING_PROMPT_VERSION,
  });
}

export function isPromptModified(settings: AiPlanningSettings): boolean {
  return settings.planningPrompt.trim() !== DEFAULT_PLANNING_PROMPT.trim();
}

export { ALLOWED_SERMON_PLAN_MODELS, DEFAULT_PLANNING_PROMPT, DEFAULT_PLANNING_PROMPT_VERSION };
