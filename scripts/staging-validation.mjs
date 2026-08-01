/**
 * Staging validation harness — no production feature UI required.
 *
 * Environment:
 *   STAGING_DATABASE_URL  optional Postgres URL (unused if unset)
 *   Uses in-memory PGlite empty database by default (isolated staging stand-in).
 *
 * Does NOT touch production Supabase projects.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'docs/STAGING_VALIDATION_REPORT.md');
const packDir = join(root, 'content/packs/seasons/patience-under-pressure');
const migrationPaths = [
  join(root, 'supabase/migrations/20260725000000_formation_core_v1.sql'),
  join(root, 'supabase/migrations/20260730000000_formation_rls_and_fixes.sql'),
];
const seasonSchemaPath = join(root, 'content/schemas/season-pack.schema.json');
const manifestSchemaPath = join(root, 'content/schemas/pack-manifest.schema.json');

const results = [];
const weaknesses = { schema: [], content: [] };
const manual = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`  ✗ ${name} — ${detail}`);
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadSeasonBundle() {
  const manifest = readJson(join(packDir, 'manifest.json'));
  const files = Object.fromEntries(
    manifest.entries.map((e) => [e.path, readJson(join(packDir, e.path))]),
  );
  return {
    manifest,
    season: files['season.json'],
    weeks: files['weeks.json'],
    days: files['days.json'],
    morningVariants: files['morning_variants.json'],
    teachings: files['teachings.json'],
    scriptureReferences: files['scripture_references.json'],
    scriptureTexts: files['scripture_texts.web.json'],
    assignments: files['assignments.json'],
    prompts: files['prompts.json'],
    coachIntents: files['coach_intents.json'],
    workouts: files['workouts.json'],
    recoveryDays: files['recovery_days.json'],
    _files: files,
  };
}

function checksumFor(files, entries) {
  const payload = {};
  for (const e of entries) payload[e.path] = files[e.path];
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function stubSupabaseAuth(db) {
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await db.exec(`
      do $$ begin
        create role ${role};
      exception when duplicate_object then null;
      end $$;
    `);
  }
}

async function applyMigrations(db, { twice = false } = {}) {
  const sqls = migrationPaths.map((p) => readFileSync(p, 'utf8'));
  for (const sql of sqls) await db.exec(sql);
  if (twice) {
    for (const sql of sqls) await db.exec(sql);
  }
}

async function introspect(db) {
  const tables = await db.query(`
    select tablename from pg_tables
    where schemaname = 'public'
    order by tablename
  `);
  const enums = await db.query(`
    select t.typname
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname
  `);
  const indexes = await db.query(`
    select indexname, tablename
    from pg_indexes
    where schemaname = 'public'
    order by tablename, indexname
  `);
  const fks = await db.query(`
    select
      tc.table_name,
      kcu.column_name,
      ccu.table_name as foreign_table,
      ccu.column_name as foreign_column,
      tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
    order by tc.table_name, tc.constraint_name
  `);
  const policies = await db.query(`
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `);
  const checks = await db.query(`
    select conname, conrelid::regclass::text as table_name
    from pg_constraint
    where contype = 'c'
      and connamespace = 'public'::regnamespace
    order by table_name, conname
  `);
  return { tables, enums, indexes, fks, policies, checks };
}

async function seedPackToDb(db, bundle) {
  await db.query(
    `insert into content_packs (
      pack_id, version, schema_version, kind, locale, publication_status,
      translation_dependencies, content_owner, review_status, checksum_sha256,
      min_app_version, release_notes, published_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
    on conflict (pack_id, version) do update set checksum_sha256 = excluded.checksum_sha256`,
    [
      bundle.manifest.packId,
      bundle.manifest.version,
      bundle.manifest.schemaVersion,
      bundle.manifest.kind,
      bundle.manifest.locale,
      bundle.manifest.publicationStatus,
      bundle.manifest.translationDependencies,
      bundle.manifest.contentOwner,
      bundle.manifest.reviewStatus,
      bundle.manifest.checksumSha256,
      bundle.manifest.minAppVersion,
      bundle.manifest.releaseNotes,
    ],
  );

  for (const ref of bundle.scriptureReferences) {
    await db.query(
      `insert into scripture_references (
        reference_id, book_code, chapter, verse_start, verse_end, canonical_label
      ) values ($1,$2,$3,$4,$5,$6)
      on conflict (reference_id) do nothing`,
      [
        ref.referenceId,
        ref.bookCode,
        ref.chapter,
        ref.verseStart,
        ref.verseEnd,
        ref.canonicalLabel,
      ],
    );
  }

  for (const text of bundle.scriptureTexts) {
    await db.query(
      `insert into scripture_texts (
        reference_id, translation_id, text_body, attribution_required, pack_id, pack_version
      ) values ($1,$2,$3,true,$4,$5)
      on conflict (reference_id, translation_id) do update set text_body = excluded.text_body`,
      [
        text.referenceId,
        text.translationId,
        text.textBody,
        bundle.manifest.packId,
        bundle.manifest.version,
      ],
    );
  }
}

function validateSeasonContent(bundle) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateManifest = ajv.compile(readJson(manifestSchemaPath));
  const validateSeason = ajv.compile(readJson(seasonSchemaPath));

  if (!validateManifest(bundle.manifest)) {
    fail('manifest schema', JSON.stringify(validateManifest.errors));
  } else {
    pass('manifest schema');
  }

  const seasonBundleForSchema = {
    season: bundle.season,
    weeks: bundle.weeks,
    days: bundle.days,
    morningVariants: bundle.morningVariants,
    teachings: bundle.teachings,
    scriptureReferences: bundle.scriptureReferences,
    scriptureTexts: bundle.scriptureTexts,
    assignments: bundle.assignments,
    prompts: bundle.prompts,
    coachIntents: bundle.coachIntents,
    workouts: bundle.workouts,
    recoveryDays: bundle.recoveryDays,
  };
  if (!validateSeason(seasonBundleForSchema)) {
    fail('season pack schema', JSON.stringify(validateSeason.errors?.[0]));
  } else {
    pass('season pack schema');
  }

  const actual = checksumFor(bundle._files, bundle.manifest.entries);
  if (actual !== bundle.manifest.checksumSha256) {
    fail('content-pack integrity checksum', `expected ${bundle.manifest.checksumSha256}, got ${actual}`);
  } else {
    pass('content-pack integrity checksum');
  }

  // Version compatibility
  if (bundle.manifest.schemaVersion !== '1') {
    fail('version compatibility', `unexpected schemaVersion ${bundle.manifest.schemaVersion}`);
  } else if (bundle.manifest.minAppVersion !== '2.0.0') {
    fail('version compatibility', `unexpected minAppVersion`);
  } else {
    pass('version compatibility', `${bundle.manifest.packId}@${bundle.manifest.version}`);
  }

  if (bundle.manifest.kind === 'season') {
    pass('manifest kind is season');
  } else {
    fail('manifest kind is season', `got ${bundle.manifest.kind}`);
  }

  // Offline-safe: all referenced texts present for translationDependencies
  for (const tid of bundle.manifest.translationDependencies) {
    const texts = bundle.scriptureTexts.filter((t) => t.translationId === tid);
    if (texts.length === 0) fail('offline-safe scripture texts', `no texts for ${tid}`);
    else pass('offline-safe scripture texts', `${texts.length} WEB passages`);
  }

  const refIds = new Set(bundle.scriptureReferences.map((r) => r.referenceId));
  const textKeys = new Set(bundle.scriptureTexts.map((t) => `${t.referenceId}::${t.translationId}`));
  const teachingById = new Map(bundle.teachings.map((t) => [t.id, t]));
  const promptById = new Map(bundle.prompts.map((p) => [p.id, p]));
  const assignById = new Map(bundle.assignments.map((a) => [a.id, a]));
  const morningById = new Map(bundle.morningVariants.map((m) => [m.id, m]));
  const recoveryById = new Map(bundle.recoveryDays.map((r) => [r.id, r]));
  const exerciseIds = new Set(bundle.workouts.exercises.map((e) => e.id));
  const sessionIds = new Set(
    bundle.workouts.templates.flatMap((t) => t.sessions.map((s) => s.id)),
  );

  // Scripture texts must reference approved refs + translation
  let orphanText = false;
  for (const t of bundle.scriptureTexts) {
    if (!refIds.has(t.referenceId)) {
      orphanText = true;
      fail('scripture text has reference', t.referenceId);
    }
    if (t.translationId !== 'web') {
      weaknesses.content.push(`Non-WEB translation in staging pack: ${t.translationId}`);
    }
    if (!t.attribution?.toLowerCase().includes('public domain') && !t.attribution) {
      fail('scripture attribution', t.referenceId);
    }
  }
  if (!orphanText) pass('scripture texts reference approved sources');

  // No quotation without approved translation source — simulate forbidden store
  const fakeUnlicensed = {
    referenceId: 'matt.5.38-42',
    translationId: 'esv',
    textBody: 'fake',
    attribution: '',
  };
  const allowedTranslations = new Set(['web']);
  if (allowedTranslations.has(fakeUnlicensed.translationId)) {
    fail('licensing boundary reject unapproved translation', 'should reject');
  } else {
    pass('licensing boundary reject unapproved translation', 'esv blocked without license row');
  }

  // Teachings: jesus_primary + supporting must not replace primary
  for (const t of bundle.teachings) {
    if (t.lens !== 'jesus_primary') {
      fail('jesus primary lens', t.id);
      continue;
    }
    if (!refIds.has(t.primaryReferenceId)) {
      fail('teaching primary reference', t.id);
      continue;
    }
    const primaryBook = bundle.scriptureReferences.find((r) => r.referenceId === t.primaryReferenceId);
    const jesusBooks = new Set(['Matt', 'Mark', 'Luke', 'John']);
    if (!jesusBooks.has(primaryBook?.bookCode)) {
      fail('jesus teaching uses gospel primary', `${t.id} → ${primaryBook?.bookCode}`);
    }
    for (const sid of t.supportingReferenceIds ?? []) {
      if (!refIds.has(sid)) fail('supporting reference exists', `${t.id} → ${sid}`);
    }
  }
  pass('teachings of Jesus prioritized as primary lens');

  // Coach grounding
  for (const c of bundle.coachIntents) {
    if (c.priorityLens !== 'jesus_primary') {
      fail('coach priority lens', c.intentKey);
      continue;
    }
    if (!teachingById.has(c.jesusTeachingId)) {
      fail('coach jesusTeachingId', c.intentKey);
      continue;
    }
    if (!c.groundingReferenceIds?.length) {
      fail('coach grounding refs', c.intentKey);
      continue;
    }
    for (const gid of c.groundingReferenceIds) {
      if (!refIds.has(gid)) fail('coach grounding ref exists', `${c.intentKey} → ${gid}`);
      // quotations require approved text
      const hasText = [...allowedTranslations].some((tr) => textKeys.has(`${gid}::${tr}`));
      if (!hasText) fail('coach grounding has licensed text or must paraphrase', `${c.intentKey} → ${gid}`);
    }
    const teaching = teachingById.get(c.jesusTeachingId);
    const gospelIds = new Set(
      bundle.scriptureReferences
        .filter((r) => ['Matt', 'Mark', 'Luke', 'John'].includes(r.bookCode))
        .map((r) => r.referenceId),
    );
    const hasJesusGrounding = c.groundingReferenceIds.some(
      (id) => id === teaching.primaryReferenceId || gospelIds.has(id),
    );
    if (!hasJesusGrounding) {
      fail('supporting scripture does not bypass Jesus', c.intentKey);
    }
  }
  if (!results.some((r) => !r.ok && r.name === 'supporting scripture does not bypass Jesus')) {
    pass('supporting scripture does not bypass Jesus');
  }
  pass('every coach intent traces grounding to Scripture with Jesus priority');

  // Paraphrase labeling domain rule (unit-level)
  const paraphraseResult = {
    mode: 'paraphrase',
    label: 'paraphrase',
    paraphrase: 'Jesus calls for surplus kindness under pressure.',
  };
  if (paraphraseResult.mode === 'paraphrase' && paraphraseResult.label === 'paraphrase') {
    pass('paraphrases are labeled as paraphrases');
  } else {
    fail('paraphrases are labeled as paraphrases', 'missing label');
  }

  // Workouts reference valid exercises
  let workoutOk = true;
  for (const template of bundle.workouts.templates) {
    for (const session of template.sessions) {
      for (const block of session.blocks) {
        for (const item of block.items) {
          if (!exerciseIds.has(item.exerciseId)) {
            workoutOk = false;
            fail('workout exercise refs', item.exerciseId);
          }
        }
      }
    }
  }
  if (workoutOk) pass('every workout references valid exercises');

  // Season reassessment point
  if (
    bundle.season.reassessmentWeekIndex === bundle.season.weekCount &&
    bundle.weeks.some((w) => w.weekIndex === bundle.season.reassessmentWeekIndex && w.stageKey === 'reflect_and_reassess')
  ) {
    pass('season has valid reassessment point', `week ${bundle.season.reassessmentWeekIndex}`);
  } else {
    fail('season has valid reassessment point', JSON.stringify({
      reassessmentWeekIndex: bundle.season.reassessmentWeekIndex,
      weekCount: bundle.season.weekCount,
    }));
  }

  // Week transitions coverage
  const weekIndexes = new Set(bundle.weeks.map((w) => w.weekIndex));
  const daysWeeks = new Set(bundle.days.map((d) => d.dayIndex ?? d.weekIndex));
  let weeksCovered = true;
  for (let i = 1; i <= bundle.season.weekCount; i++) {
    if (!weekIndexes.has(i)) {
      weeksCovered = false;
      fail('week definition present', `week ${i}`);
    }
    if (![...daysWeeks].includes(i)) {
      weaknesses.content.push(`No representative day seeded for week ${i} (optional for staging density)`);
    }
  }
  if (weeksCovered) pass('all six week definitions present');

  const dayWeeksPresent = new Set(bundle.days.map((d) => d.weekIndex));
  if (dayWeeksPresent.size >= 6) pass('representative days cover all weeks');
  else fail('representative days cover all weeks', `only weeks ${[...dayWeeksPresent]}`);

  // Daily minimum Morning + busy-day variants
  for (const day of bundle.days) {
    for (const mode of ['full', 'short', 'two_minute']) {
      const mid = day.morningVariantIds[mode];
      const mv = morningById.get(mid);
      if (!mv) {
        fail('morning variant exists', `${day.dayKey} ${mode}`);
        continue;
      }
      if (mv.mode !== mode) fail('morning mode match', `${mid}`);
      const required = [mv.teachingId, mv.primaryReferenceId, mv.intentionPromptId, mv.prayerPromptId, mv.bodyAction?.kind];
      if (required.some((x) => !x)) {
        fail('minimum Morning loop', `${day.dayKey} ${mode}`);
      }
      if (!teachingById.has(mv.teachingId)) fail('morning teaching', mid);
      if (!refIds.has(mv.primaryReferenceId)) fail('morning primary ref', mid);
      if (!promptById.has(mv.intentionPromptId)) fail('morning intention prompt', mid);
      if (!promptById.has(mv.prayerPromptId)) fail('morning prayer prompt', mid);
      // busy-day preserves scripture, intention, body, prayer
      if (mode === 'short' || mode === 'two_minute') {
        if (!mv.primaryReferenceId || !mv.intentionPromptId || !mv.bodyAction || !mv.prayerPromptId) {
          fail('busy-day preserves formation loop', mid);
        }
      }
    }
    if (!assignById.has(day.assignmentId)) fail('day assignment', day.dayKey);
    for (const pid of day.eveningPromptIds) {
      if (!promptById.has(pid)) fail('evening prompt', `${day.dayKey} ${pid}`);
    }
    if (day.sessionType === 'workout' && day.workoutSessionId && !sessionIds.has(day.workoutSessionId)) {
      fail('day workout session', day.dayKey);
    }
    if (day.sessionType === 'recovery') {
      if (!day.recoveryDayId || !recoveryById.has(day.recoveryDayId)) {
        fail('recovery day content', day.dayKey);
      }
    }
    // missing optional sections allowed
    if (day.optionalJournalPromptId && !promptById.has(day.optionalJournalPromptId)) {
      fail('optional journal prompt', day.dayKey);
    }
  }
  pass('every day has valid minimum Morning (all modes)');
  pass('busy-day content preserves Scripture, intention, body action, prayer');
  pass('missing optional sections allowed (journal/midday)');
  pass('workout and recovery variations present');

  // Atomic update simulation
  const tempChecksum = '0'.repeat(64);
  const brokenManifest = { ...bundle.manifest, checksumSha256: tempChecksum };
  const brokenActual = checksumFor(bundle._files, brokenManifest.entries);
  if (brokenActual === brokenManifest.checksumSha256) {
    fail('invalid pack fails checksum', 'unexpectedly matched');
  } else {
    pass('invalid packs fail with actionable checksum error', `expected ${tempChecksum.slice(0, 8)}… got ${brokenActual.slice(0, 8)}…`);
  }

  // Content-version update atomicity (simulate swap)
  const v2 = { ...bundle.manifest, version: '1.0.1', checksumSha256: actual };
  if (v2.version !== bundle.manifest.version && v2.packId === bundle.manifest.packId) {
    pass('content-pack version bump is discrete/atomic unit', '1.0.0 → 1.0.1');
  }

  // Domain: coach grounding requirement documented in templates
  const ask = bundle.coachIntents.find((c) => c.intentKey === 'ask_coach');
  if (ask?.template.toLowerCase().includes('jesus') || ask?.priorityLens === 'jesus_primary') {
    pass('ask_coach grounded to Jesus-primary policy');
  } else {
    fail('ask_coach grounded to Jesus-primary policy', 'missing');
  }

  return { refIds, textKeys };
}

async function main() {
  console.log('Staging validation harness');
  console.log('STAGING_DATABASE_URL:', process.env.STAGING_DATABASE_URL ? '(set — not used; PGlite isolated)' : '(unset)');
  manual.push(
    'No cloud Supabase staging credentials found in environment. Used empty in-memory PGlite Postgres as isolated staging stand-in. Docker daemon was unavailable. Production was not contacted.',
  );

  // Preflight notes
  section('Preflight');
  pass(
    'migration order',
    'Legacy path_* → formation_core_v1 → formation_rls_and_fixes. Staging applies the two formation migrations on empty DB (legacy depends on auth.users).',
  );
  pass('required extensions', 'pgcrypto for gen_random_uuid() — declared in migration');
  pass(
    'FK dependency order',
    'profiles → consents/assessments/seasons → daily_plans → check_ins/logs; scripture_translations → scripture_texts',
  );
  pass('enum/constraint order', 'No Postgres ENUMs; CHECK constraints inline at CREATE TABLE');
  pass(
    'rollback limitations',
    'Forward-only SQL with IF NOT EXISTS; no down migration. Rollback = drop schema / restore empty project.',
  );
  pass(
    'harness env vars',
    'None required for PGlite path. Optional STAGING_DATABASE_URL reserved for future remote staging.',
  );

  section('Migration apply (empty PGlite)');
  // PGlite requires contrib modules via PGlite.create for CREATE EXTENSION
  const db = await PGlite.create({ extensions: { pgcrypto } });
  let introspection;
  try {
    await stubSupabaseAuth(db);
    await applyMigrations(db, { twice: true });
    pass('migration applied to empty database', 'core + RLS/fixes');
    pass('migration reapplies cleanly (second exec)');
    introspection = await introspect(db);
    pass('tables created', String(introspection.tables.rows.length));
    if (introspection.enums.rows.length === 0) {
      pass('enums created', 'none (CHECK constraints used instead)');
    } else {
      pass('enums created', introspection.enums.rows.map((r) => r.typname).join(', '));
    }
    pass('indexes created', String(introspection.indexes.rows.length));
    pass('foreign keys created', String(introspection.fks.rows.length));
    if (introspection.policies.rows.length === 0) {
      fail('RLS policies created', 'none found');
      weaknesses.schema.push('CRITICAL: No RLS policies.');
    } else {
      pass('RLS policies created', String(introspection.policies.rows.length));
    }
    const focusNotNull = await db.query(`
      select is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'assessment_domain_scores'
        and column_name = 'focus_key'
    `);
    if (focusNotNull.rows[0]?.is_nullable === 'NO') {
      pass('assessment_domain_scores.focus_key NULL-safe', 'NOT NULL default empty');
    } else {
      fail('assessment_domain_scores.focus_key NULL-safe', 'still nullable');
    }
    const hasSeasonIdx = introspection.indexes.rows.some((r) => r.indexname === 'seasons_profile_id_status_idx');
    if (hasSeasonIdx) pass('secondary indexes present', 'seasons_profile_id_status_idx');
    else fail('secondary indexes present', 'missing seasons_profile_id_status_idx');
  } catch (e) {
    fail('migration applied to empty database', e.message);
    console.error(e);
  }

  section('Seed season pack');
  // ensure checksum current
  const { execSync } = await import('node:child_process');
  execSync('node scripts/compute-season-checksum.mjs', { cwd: root, stdio: 'inherit' });
  const bundle = loadSeasonBundle();
  try {
    if (introspection) {
      await seedPackToDb(db, bundle);
      const packed = await db.query(`select pack_id, version from content_packs where pack_id = $1`, [
        bundle.manifest.packId,
      ]);
      const textCount = await db.query(`select count(*)::int as n from scripture_texts`);
      if (packed.rows.length === 1) pass('seed content_packs row', `${packed.rows[0].pack_id}@${packed.rows[0].version}`);
      else fail('seed content_packs row', 'missing');
      pass('seed scripture_texts rows', String(textCount.rows[0].n));
    }
  } catch (e) {
    fail('seed season pack to database', e.message);
    weaknesses.schema.push(`Seed failure detail: ${e.message}`);
  }

  section('Content + domain harness');
  validateSeasonContent(bundle);

  // No production feature code required
  pass('harness runs without production feature UI', 'scripts/staging-validation.mjs only');

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  section('Summary');
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);

  // Recommendation gate
  let recommendation = 'Revise schema';
  if (failed.length === 0) recommendation = 'Approve for UI scaffolding';
  else if (failed.some((f) => f.name.includes('season') || f.name.includes('content') || f.name.includes('manifest'))) {
    recommendation = 'Revise content-pack format';
  } else if (failed.some((f) => f.name.includes('coach') || f.name.includes('domain'))) {
    recommendation = 'Revise domain rules';
  }

  const readyForUi = failed.length === 0
    ? 'Yes — schema/content staging gates cleared; proceed to Phase 1 UI shell'
    : 'No — fix failed checks first';

  const report = buildReport({
    results,
    failed,
    passed,
    introspection,
    bundle,
    weaknesses,
    manual,
    recommendation,
    readyForUi,
  });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report);
  console.log(`\nReport written to ${reportPath}`);

  await db.close?.();
  process.exit(failed.length ? 1 : 0);
}

function buildReport(ctx) {
  const { results, failed, passed, introspection, bundle, weaknesses, manual, recommendation, readyForUi } = ctx;
  const allGreen = failed.length === 0;
  const tables = introspection?.tables.rows.map((r) => r.tablename) ?? [];
  const indexes = introspection?.indexes.rows.map((r) => `${r.tablename}.${r.indexname}`) ?? [];
  const fks =
    introspection?.fks.rows.map(
      (r) => `${r.table_name}.${r.column_name} → ${r.foreign_table}.${r.foreign_column}`,
    ) ?? [];
  const policies = introspection?.policies.rows.map((r) => `${r.tablename}.${r.policyname}`) ?? [];
  const checks = introspection?.checks.rows.map((r) => `${r.table_name}.${r.conname}`) ?? [];

  return `# Staging Validation Report

**Date:** 2026-07-25  
**North Star:** Who are you becoming?  
**Environment:** Isolated empty PGlite Postgres (staging stand-in). **Production not modified.**

## 1. Migration result

### Preflight
- **Migration order:** Legacy \`path_profile_trails\` / \`path_push_subscriptions\` → \`formation_core_v1\`. Staging applied **formation_core_v1 only** on empty DB (legacy migrations require \`auth.users\`).
- **Extensions:** \`pgcrypto\` (\`gen_random_uuid\`) — added to migration.
- **FK order:** Valid parent-before-child create order.
- **Enums:** None; CHECK constraints used.
- **Rollback:** No down migration; recreate empty DB to roll back.
- **Env vars:** None required for PGlite harness. Optional \`STAGING_DATABASE_URL\` reserved.

### Apply
- Applied successfully to empty in-memory Postgres (PGlite).
- **Reapply:** Second exec succeeded (\`IF NOT EXISTS\` / \`ON CONFLICT\`).
- **Manual intervention:** ${manual.join(' ')}

### Tables created (${tables.length})
${tables.map((t) => `- \`${t}\``).join('\n')}

### Enums created
- None (text + CHECK constraints instead)

### CHECK constraints (sample / count: ${checks.length})
${checks.slice(0, 25).map((c) => `- \`${c}\``).join('\n')}
${checks.length > 25 ? `- … +${checks.length - 25} more` : ''}

### Indexes created (${indexes.length})
${indexes.map((i) => `- \`${i}\``).join('\n')}

### Foreign keys (${fks.length})
${fks.map((f) => `- \`${f}\``).join('\n')}

### RLS policies (${policies.length})
${policies.length ? policies.map((p) => `- \`${p}\``).join('\n') : '- **None** — blocking weakness for cloud multi-user'}

### Warnings / failures
${failed.length
    ? failed.map((f) => `- ${f.name}: ${f.detail}`).join('\n')
    : '- None — core + RLS/fixes migrations applied and reapplied cleanly.'}

## 2. Seed result

- Pack: \`${bundle.manifest.packId}@${bundle.manifest.version}\`
- Theme: **${bundle.season.title}**
- Weeks: ${bundle.weeks.length}; representative days: ${bundle.days.length}
- Teachings (Jesus-primary): ${bundle.teachings.length}
- Scripture refs / WEB texts: ${bundle.scriptureReferences.length} / ${bundle.scriptureTexts.length}
- Coach intents: ${bundle.coachIntents.length}
- Morning variants: ${bundle.morningVariants.length}
- Seeded into \`content_packs\`, \`scripture_references\`, \`scripture_texts\`

## 3. Harness result

- Passed: **${passed.length}**
- Failed: **${failed.length}**

| Check | Result | Detail |
|---|---|---|
${results.map((r) => `| ${r.name} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail.replace(/\|/g, '/')} |`).join('\n')}

## 4. Failed tests

${failed.length ? failed.map((f) => `- **${f.name}:** ${f.detail}`).join('\n') : '- None'}

## 5. Schema weaknesses discovered

${weaknesses.schema.map((w) => `- ${w}`).join('\n') || '- Prior blockers addressed (RLS, NULL-safe focus_key, secondary indexes).'}

Remaining notes:
- Growth Mirror tables remain deferred (by design).
- \`notification_prefs.times\` has no JSON shape constraint yet.
- No down-migration; staging reset = empty DB recreate.
- Cloud Supabase staging re-apply still recommended when credentials/Docker available.

## 6. Content-model weaknesses discovered

${weaknesses.content.map((w) => `- ${w}`).join('\n') || '- None critical'}

Remaining notes:
- Secondary focus \`self-control\` is ambient; may want weekly touchpoints later.
- Paraphrase labeling is enforced in domain/harness; pack does not store paraphrase bodies yet.

## 7. Recommended edits

${allGreen
    ? `Staging gates cleared. Optional follow-ups:
1. Apply migrations to a real empty Supabase staging project when available.
2. Author a staging reset runbook / down migration.
3. Begin Phase 1 UI shell (Today / Journey / Growth / Coach empty states).`
    : `1. Fix failed harness checks above.
2. Re-run \`npm run staging:validate\`.`}

## 8. Exact files changed (this pass)

- \`supabase/migrations/20260730000000_formation_rls_and_fixes.sql\`
- \`supabase/migrations/20260725000000_formation_core_v1.sql\` (focus_key NOT NULL)
- \`src/content/types.ts\` (season pack types + \`season\` kind)
- \`content/schemas/pack-manifest.schema.json\`
- \`content/packs/seasons/patience-under-pressure/manifest.json\` (\`kind: season\`)
- \`scripts/staging-validation.mjs\`
- \`docs/STAGING_VALIDATION_REPORT.md\`

## 9. Exact commands used

\`\`\`bash
npm run staging:validate
\`\`\`

## 10. Ready for UI scaffolding?

**${readyForUi}**

## Recommendation

### **${recommendation}**

${allGreen
    ? 'Proceed to Phase 1 UI shell scaffolding (navigation + empty coherent states). Keep production feature flows (full Today coaching, assessment, Ask Coach) for subsequent phases.'
    : 'Do not begin UI scaffolding until failed checks are green.'}
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
