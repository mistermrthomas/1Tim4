import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packDir = join(__dirname, '../content/packs/foundation');

const entryFiles = [
  'foci.json',
  'assignments.json',
  'prompts.json',
  'teachings_jesus.json',
  'scripture_references.json',
  'scripture_texts.web.json',
  'workouts.json',
  'coaching_fallback.json',
  'nutrition.json',
  'safety.json',
];

const payload = {};
for (const file of entryFiles) {
  payload[file] = JSON.parse(readFileSync(join(packDir, file), 'utf8'));
}

const canonical = JSON.stringify(payload);
const checksum = createHash('sha256').update(canonical).digest('hex');

const manifest = {
  packId: 'foundation.core',
  version: '1.0.0',
  schemaVersion: '1',
  kind: 'foundation',
  locale: 'en-US',
  publicationStatus: 'published',
  translationDependencies: ['web'],
  contentOwner: 'formation-core',
  reviewStatus: 'theologically_reviewed',
  checksumSha256: checksum,
  minAppVersion: '2.0.0',
  releaseNotes: 'Phase 0 foundation pack: first season seed, Jesus teaching, 3 workout templates, offline coaching.',
  entries: [
    { path: 'foci.json', type: 'foci' },
    { path: 'assignments.json', type: 'assignments' },
    { path: 'prompts.json', type: 'prompts' },
    { path: 'teachings_jesus.json', type: 'teachings' },
    { path: 'scripture_references.json', type: 'scripture_references' },
    { path: 'scripture_texts.web.json', type: 'scripture_texts' },
    { path: 'workouts.json', type: 'workouts' },
    { path: 'coaching_fallback.json', type: 'coaching_messages' },
    { path: 'nutrition.json', type: 'nutrition' },
    { path: 'safety.json', type: 'safety' },
  ],
};

writeFileSync(join(packDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Wrote manifest.json');
console.log('checksumSha256:', checksum);
console.log(
  'files in pack:',
  readdirSync(packDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .join(', '),
);
