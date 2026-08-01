import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packDir = join(__dirname, '../content/packs/seasons/patience-under-pressure');

const entryFiles = [
  'season.json',
  'weeks.json',
  'days.json',
  'morning_variants.json',
  'teachings.json',
  'scripture_references.json',
  'scripture_texts.web.json',
  'assignments.json',
  'prompts.json',
  'coach_intents.json',
  'workouts.json',
  'recovery_days.json',
];

const payload = {};
for (const file of entryFiles) {
  payload[file] = JSON.parse(readFileSync(join(packDir, file), 'utf8'));
}

const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const manifest = {
  packId: 'season.patience-under-pressure',
  version: '1.0.0',
  schemaVersion: '1',
  kind: 'season',
  locale: 'en-US',
  publicationStatus: 'published',
  translationDependencies: ['web'],
  contentOwner: 'formation-core',
  reviewStatus: 'theologically_reviewed',
  checksumSha256: checksum,
  minAppVersion: '2.0.0',
  releaseNotes:
    'Staging seed: Patience Under Pressure six-week season with representative days, busy-day variants, recovery, and coach grounding.',
  entries: [
    { path: 'season.json', type: 'season' },
    { path: 'weeks.json', type: 'weeks' },
    { path: 'days.json', type: 'days' },
    { path: 'morning_variants.json', type: 'morning_variants' },
    { path: 'teachings.json', type: 'teachings' },
    { path: 'scripture_references.json', type: 'scripture_references' },
    { path: 'scripture_texts.web.json', type: 'scripture_texts' },
    { path: 'assignments.json', type: 'assignments' },
    { path: 'prompts.json', type: 'prompts' },
    { path: 'coach_intents.json', type: 'coach_intents' },
    { path: 'workouts.json', type: 'workouts' },
    { path: 'recovery_days.json', type: 'recovery_days' },
  ],
};

writeFileSync(join(packDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Wrote season manifest.json');
console.log('checksumSha256:', checksum);
console.log(
  'files:',
  readdirSync(packDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .join(', '),
);
