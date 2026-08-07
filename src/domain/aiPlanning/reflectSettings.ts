/**
 * Editable Today reflection (Observe → Reflect) prompt — IndexedDB entities.
 * Never stores API keys.
 */

import {
  DEFAULT_FORMATION_REFLECT_PROMPT,
  DEFAULT_FORMATION_REFLECT_PROMPT_VERSION,
} from '../../../shared/defaultFormationReflectPrompt';
import { createIndexedDbAdapter } from '../../data/storage/indexedDbAdapter';
import type { StorageAdapter } from '../../data/storage/StorageAdapter';

const SETTINGS_KEY = 'aiFormationReflect:settings';

export interface FormationReflectSettings {
  reflectPrompt: string;
  promptVersion: string;
  updatedAt: string;
}

let memory: FormationReflectSettings | null = null;
let adapterPromise: Promise<StorageAdapter | null> | null = null;

export function defaultFormationReflectSettings(): FormationReflectSettings {
  return {
    reflectPrompt: DEFAULT_FORMATION_REFLECT_PROMPT,
    promptVersion: DEFAULT_FORMATION_REFLECT_PROMPT_VERSION,
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

export async function readFormationReflectSettings(): Promise<FormationReflectSettings> {
  const defaults = defaultFormationReflectSettings();
  const adapter = await getAdapter();
  if (!adapter) {
    memory ??= defaults;
    return structuredClone(memory);
  }
  const stored = await adapter.get<FormationReflectSettings>('entities', SETTINGS_KEY);
  if (!stored) return defaults;
  return {
    reflectPrompt: stored.reflectPrompt?.trim() || defaults.reflectPrompt,
    promptVersion: stored.promptVersion || defaults.promptVersion,
    updatedAt: stored.updatedAt || defaults.updatedAt,
  };
}

export async function writeFormationReflectSettings(
  patch: Partial<FormationReflectSettings>,
): Promise<FormationReflectSettings> {
  const current = await readFormationReflectSettings();
  const next: FormationReflectSettings = {
    ...current,
    ...patch,
    reflectPrompt:
      (patch.reflectPrompt ?? current.reflectPrompt).trim() || DEFAULT_FORMATION_REFLECT_PROMPT,
    updatedAt: new Date().toISOString(),
  };
  const adapter = await getAdapter();
  if (!adapter) {
    memory = next;
    return structuredClone(next);
  }
  await adapter.put('entities', SETTINGS_KEY, next);
  return next;
}

export async function resetFormationReflectPrompt(): Promise<FormationReflectSettings> {
  return writeFormationReflectSettings({
    reflectPrompt: DEFAULT_FORMATION_REFLECT_PROMPT,
    promptVersion: DEFAULT_FORMATION_REFLECT_PROMPT_VERSION,
  });
}

export function isFormationReflectPromptModified(settings: FormationReflectSettings): boolean {
  return settings.reflectPrompt.trim() !== DEFAULT_FORMATION_REFLECT_PROMPT.trim();
}

export { DEFAULT_FORMATION_REFLECT_PROMPT, DEFAULT_FORMATION_REFLECT_PROMPT_VERSION };
