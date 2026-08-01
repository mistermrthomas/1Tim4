import type { ContentPackManifest, InstalledSeasonPack, SeasonPackData } from '../types';

import manifestJson from '../../../content/packs/seasons/patience-under-pressure/manifest.json';
import season from '../../../content/packs/seasons/patience-under-pressure/season.json';
import weeks from '../../../content/packs/seasons/patience-under-pressure/weeks.json';
import days from '../../../content/packs/seasons/patience-under-pressure/days.json';
import morningVariants from '../../../content/packs/seasons/patience-under-pressure/morning_variants.json';
import teachings from '../../../content/packs/seasons/patience-under-pressure/teachings.json';
import scriptureReferences from '../../../content/packs/seasons/patience-under-pressure/scripture_references.json';
import scriptureTexts from '../../../content/packs/seasons/patience-under-pressure/scripture_texts.web.json';
import assignments from '../../../content/packs/seasons/patience-under-pressure/assignments.json';
import prompts from '../../../content/packs/seasons/patience-under-pressure/prompts.json';
import coachIntents from '../../../content/packs/seasons/patience-under-pressure/coach_intents.json';
import workouts from '../../../content/packs/seasons/patience-under-pressure/workouts.json';
import recoveryDays from '../../../content/packs/seasons/patience-under-pressure/recovery_days.json';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildData(): SeasonPackData {
  return {
    season: season as SeasonPackData['season'],
    weeks: weeks as SeasonPackData['weeks'],
    days: days as SeasonPackData['days'],
    morningVariants: morningVariants as SeasonPackData['morningVariants'],
    teachings: teachings as SeasonPackData['teachings'],
    scriptureReferences: scriptureReferences as SeasonPackData['scriptureReferences'],
    scriptureTexts: scriptureTexts as SeasonPackData['scriptureTexts'],
    assignments: assignments as SeasonPackData['assignments'],
    prompts: prompts as SeasonPackData['prompts'],
    coachIntents: coachIntents as SeasonPackData['coachIntents'],
    workouts: workouts as SeasonPackData['workouts'],
    recoveryDays: recoveryDays as SeasonPackData['recoveryDays'],
  };
}

function payloadForChecksum(data: SeasonPackData, entries: ContentPackManifest['entries']) {
  const map: Record<string, unknown> = {
    'season.json': data.season,
    'weeks.json': data.weeks,
    'days.json': data.days,
    'morning_variants.json': data.morningVariants,
    'teachings.json': data.teachings,
    'scripture_references.json': data.scriptureReferences,
    'scripture_texts.web.json': data.scriptureTexts,
    'assignments.json': data.assignments,
    'prompts.json': data.prompts,
    'coach_intents.json': data.coachIntents,
    'workouts.json': data.workouts,
    'recovery_days.json': data.recoveryDays,
  };
  const ordered: Record<string, unknown> = {};
  for (const e of entries) ordered[e.path] = map[e.path];
  return ordered;
}

/** Load bundled Patience Under Pressure season pack (preview / offline foundation). */
export async function loadSeasonPack(): Promise<InstalledSeasonPack> {
  const manifest = manifestJson as ContentPackManifest;
  const data = buildData();
  const checksum = await sha256Hex(JSON.stringify(payloadForChecksum(data, manifest.entries)));
  if (checksum !== manifest.checksumSha256) {
    throw new Error(
      `Season pack checksum mismatch (expected ${manifest.checksumSha256}, got ${checksum})`,
    );
  }
  return {
    manifest,
    data,
    source: 'bundled',
    installedAt: new Date().toISOString(),
  };
}
