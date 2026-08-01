import type {
  FoundationPackData,
  ContentPackManifest,
  InstalledContentPack,
} from '../types';

import manifestJson from '../../../content/packs/foundation/manifest.json';
import foci from '../../../content/packs/foundation/foci.json';
import assignments from '../../../content/packs/foundation/assignments.json';
import prompts from '../../../content/packs/foundation/prompts.json';
import teachings from '../../../content/packs/foundation/teachings_jesus.json';
import scriptureReferences from '../../../content/packs/foundation/scripture_references.json';
import scriptureTexts from '../../../content/packs/foundation/scripture_texts.web.json';
import workouts from '../../../content/packs/foundation/workouts.json';
import coachingMessages from '../../../content/packs/foundation/coaching_fallback.json';
import nutrition from '../../../content/packs/foundation/nutrition.json';
import safety from '../../../content/packs/foundation/safety.json';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildData(): FoundationPackData {
  return {
    foci: foci as FoundationPackData['foci'],
    assignments: assignments as FoundationPackData['assignments'],
    prompts: prompts as FoundationPackData['prompts'],
    teachings: teachings as FoundationPackData['teachings'],
    scriptureReferences: scriptureReferences as FoundationPackData['scriptureReferences'],
    scriptureTexts: scriptureTexts as FoundationPackData['scriptureTexts'],
    workouts: workouts as FoundationPackData['workouts'],
    coachingMessages: coachingMessages as FoundationPackData['coachingMessages'],
    nutrition: nutrition as FoundationPackData['nutrition'],
    safety: safety as FoundationPackData['safety'],
  };
}

function payloadForChecksum(data: FoundationPackData, entries: ContentPackManifest['entries']) {
  const map: Record<string, unknown> = {
    'foci.json': data.foci,
    'assignments.json': data.assignments,
    'prompts.json': data.prompts,
    'teachings_jesus.json': data.teachings,
    'scripture_references.json': data.scriptureReferences,
    'scripture_texts.web.json': data.scriptureTexts,
    'workouts.json': data.workouts,
    'coaching_fallback.json': data.coachingMessages,
    'nutrition.json': data.nutrition,
    'safety.json': data.safety,
  };
  const ordered: Record<string, unknown> = {};
  for (const e of entries) {
    ordered[e.path] = map[e.path];
  }
  return ordered;
}

/**
 * Load bundled foundation pack and verify integrity.
 * Throws if checksum fails — never returns a partial pack.
 */
export async function loadFoundationPack(): Promise<InstalledContentPack> {
  const manifest = manifestJson as ContentPackManifest;
  const data = buildData();
  const canonical = JSON.stringify(payloadForChecksum(data, manifest.entries));
  const checksum = await sha256Hex(canonical);
  if (checksum !== manifest.checksumSha256) {
    throw new Error(
      `Foundation pack checksum mismatch (expected ${manifest.checksumSha256}, got ${checksum})`,
    );
  }
  return {
    manifest,
    data,
    source: 'bundled',
    installedAt: new Date().toISOString(),
  };
}
