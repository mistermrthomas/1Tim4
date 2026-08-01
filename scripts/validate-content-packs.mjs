import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const packDir = join(root, 'content/packs/foundation');
const schemaPath = join(root, 'content/schemas/pack-manifest.schema.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateManifest = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

const manifest = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8'));
if (!validateManifest(manifest)) {
  console.error('Manifest schema errors:', validateManifest.errors);
  process.exit(1);
}

const payload = {};
for (const entry of manifest.entries) {
  payload[entry.path] = JSON.parse(readFileSync(join(packDir, entry.path), 'utf8'));
}
const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if (checksum !== manifest.checksumSha256) {
  console.error('Checksum mismatch.');
  console.error(' expected:', manifest.checksumSha256);
  console.error(' actual:  ', checksum);
  console.error('Run: npm run content:checksum');
  process.exit(1);
}

// Referential checks
const refs = new Set(payload['scripture_references.json'].map((r) => r.referenceId));
const texts = payload['scripture_texts.web.json'];
for (const t of texts) {
  if (!refs.has(t.referenceId)) {
    console.error('scripture text missing reference:', t.referenceId);
    process.exit(1);
  }
}
const teachings = payload['teachings_jesus.json'];
for (const t of teachings) {
  if (!refs.has(t.primaryReferenceId)) {
    console.error('teaching missing primary reference:', t.id);
    process.exit(1);
  }
}
const exercises = new Set(payload['workouts.json'].exercises.map((e) => e.id));
for (const template of payload['workouts.json'].templates) {
  for (const session of template.sessions) {
    for (const block of session.blocks) {
      for (const item of block.items) {
        if (!exercises.has(item.exerciseId)) {
          console.error('unknown exerciseId:', item.exerciseId);
          process.exit(1);
        }
      }
    }
  }
}
if (payload['workouts.json'].templates.length !== 3) {
  console.error('Expected exactly 3 workout templates in foundation pack');
  process.exit(1);
}

console.log('Content packs OK:', manifest.packId, manifest.version);
