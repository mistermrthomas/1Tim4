# Staging Validation Report

**Date:** 2026-07-25  
**North Star:** Who are you becoming?  
**Environment:** Isolated empty PGlite Postgres (staging stand-in). **Production not modified.**

## 1. Migration result

### Preflight
- **Migration order:** Legacy `path_profile_trails` / `path_push_subscriptions` → `formation_core_v1`. Staging applied **formation_core_v1 only** on empty DB (legacy migrations require `auth.users`).
- **Extensions:** `pgcrypto` (`gen_random_uuid`) — added to migration.
- **FK order:** Valid parent-before-child create order.
- **Enums:** None; CHECK constraints used.
- **Rollback:** No down migration; recreate empty DB to roll back.
- **Env vars:** None required for PGlite harness. Optional `STAGING_DATABASE_URL` reserved.

### Apply
- Applied successfully to empty in-memory Postgres (PGlite).
- **Reapply:** Second exec succeeded (`IF NOT EXISTS` / `ON CONFLICT`).
- **Manual intervention:** No cloud Supabase staging credentials found in environment. Used empty in-memory PGlite Postgres as isolated staging stand-in. Docker daemon was unavailable. Production was not contacted.

### Tables created (34)
- `assessment_domain_scores`
- `assessments`
- `body_metrics`
- `check_ins`
- `coach_memory_items`
- `coach_messages`
- `coach_recommendations`
- `coach_threads`
- `coach_usage_daily`
- `consents`
- `content_packs`
- `daily_plans`
- `evidence_notes`
- `growth_snapshots`
- `journal_entries`
- `milestones`
- `notification_prefs`
- `practice_assignments`
- `profile_content_installs`
- `profiles`
- `recovery_logs`
- `recovery_targets`
- `safety_clearances`
- `scripture_references`
- `scripture_texts`
- `scripture_translations`
- `season_foci`
- `season_recommendations`
- `season_weeks`
- `seasons`
- `sync_cursors`
- `sync_tombstones`
- `weekly_reviews`
- `workout_logs`

### Enums created
- None (text + CHECK constraints instead)

### CHECK constraints (sample / count: 28)
- `assessments.assessments_kind_check`
- `assessments.assessments_status_check`
- `check_ins.check_ins_stage_check`
- `check_ins.check_ins_status_check`
- `coach_memory_items.coach_memory_items_confidence_check`
- `coach_memory_items.coach_memory_items_source_check`
- `coach_messages.coach_messages_role_check`
- `coach_recommendations.coach_recommendations_status_check`
- `coach_threads.coach_threads_mode_check`
- `coach_threads.coach_threads_status_check`
- `content_packs.content_packs_publication_status_check`
- `daily_plans.daily_plans_evening_status_check`
- `daily_plans.daily_plans_midday_status_check`
- `daily_plans.daily_plans_morning_mode_check`
- `daily_plans.daily_plans_morning_status_check`
- `evidence_notes.evidence_notes_kind_check`
- `notification_prefs.notification_prefs_mode_check`
- `profile_content_installs.profile_content_installs_source_check`
- `profiles.profiles_unit_system_check`
- `recovery_logs.recovery_logs_energy_check`
- `recovery_logs.recovery_logs_sleep_quality_check`
- `recovery_logs.recovery_logs_soreness_check`
- `safety_clearances.safety_clearances_status_check`
- `season_foci.season_foci_role_check`
- `season_recommendations.season_recommendations_status_check`
- … +3 more

### Indexes created (58)
- `assessment_domain_scores.assessment_domain_scores_assessment_id_domain_focus_key_key`
- `assessment_domain_scores.assessment_domain_scores_pkey`
- `assessments.assessments_pkey`
- `assessments.assessments_profile_id_kind_idx`
- `body_metrics.body_metrics_pkey`
- `body_metrics.body_metrics_profile_id_recorded_on_source_key`
- `check_ins.check_ins_daily_plan_id_idx`
- `check_ins.check_ins_daily_plan_id_stage_key`
- `check_ins.check_ins_pkey`
- `coach_memory_items.coach_memory_items_pkey`
- `coach_messages.coach_messages_pkey`
- `coach_recommendations.coach_recommendations_pkey`
- `coach_recommendations.coach_recommendations_profile_status_idx`
- `coach_threads.coach_threads_pkey`
- `coach_threads.coach_threads_profile_id_idx`
- `coach_usage_daily.coach_usage_daily_pkey`
- `consents.consents_pkey`
- `consents.consents_profile_id_kind_key`
- `content_packs.content_packs_pkey`
- `daily_plans.daily_plans_pkey`
- `daily_plans.daily_plans_profile_id_plan_date_key`
- `daily_plans.daily_plans_season_id_idx`
- `evidence_notes.evidence_notes_pkey`
- `evidence_notes.evidence_notes_profile_id_created_at_idx`
- `growth_snapshots.growth_snapshots_pkey`
- `growth_snapshots.growth_snapshots_profile_id_snapshot_on_key`
- `journal_entries.journal_entries_pkey`
- `journal_entries.journal_entries_profile_id_created_at_idx`
- `milestones.milestones_pkey`
- `notification_prefs.notification_prefs_pkey`
- `practice_assignments.practice_assignments_daily_plan_id_key`
- `practice_assignments.practice_assignments_pkey`
- `profile_content_installs.profile_content_installs_pkey`
- `profiles.profiles_auth_user_id_key`
- `profiles.profiles_pkey`
- `recovery_logs.recovery_logs_daily_plan_id_key`
- `recovery_logs.recovery_logs_pkey`
- `recovery_targets.recovery_targets_daily_plan_id_key`
- `recovery_targets.recovery_targets_pkey`
- `safety_clearances.safety_clearances_pkey`
- `safety_clearances.safety_clearances_profile_id_key`
- `scripture_references.scripture_references_pkey`
- `scripture_texts.scripture_texts_pkey`
- `scripture_translations.scripture_translations_pkey`
- `season_foci.season_foci_pkey`
- `season_foci.season_foci_season_id_role_key`
- `season_recommendations.season_recommendations_pkey`
- `season_weeks.season_weeks_pkey`
- `season_weeks.season_weeks_season_id_week_index_key`
- `seasons.seasons_pkey`
- `seasons.seasons_profile_id_status_idx`
- `sync_cursors.sync_cursors_pkey`
- `sync_tombstones.sync_tombstones_pkey`
- `weekly_reviews.weekly_reviews_pkey`
- `weekly_reviews.weekly_reviews_season_id_week_index_key`
- `workout_logs.workout_logs_daily_plan_id_key`
- `workout_logs.workout_logs_pkey`
- `workout_logs.workout_logs_profile_id_idx`

### Foreign keys (45)
- `assessment_domain_scores.assessment_id → assessments.id`
- `assessments.profile_id → profiles.id`
- `body_metrics.profile_id → profiles.id`
- `check_ins.daily_plan_id → daily_plans.id`
- `coach_memory_items.profile_id → profiles.id`
- `coach_memory_items.season_id → seasons.id`
- `coach_messages.thread_id → coach_threads.id`
- `coach_recommendations.profile_id → profiles.id`
- `coach_threads.daily_plan_id → daily_plans.id`
- `coach_threads.profile_id → profiles.id`
- `coach_threads.season_id → seasons.id`
- `coach_usage_daily.profile_id → profiles.id`
- `consents.profile_id → profiles.id`
- `daily_plans.profile_id → profiles.id`
- `daily_plans.season_id → seasons.id`
- `evidence_notes.daily_plan_id → daily_plans.id`
- `evidence_notes.profile_id → profiles.id`
- `evidence_notes.season_id → seasons.id`
- `growth_snapshots.profile_id → profiles.id`
- `journal_entries.check_in_id → check_ins.id`
- `journal_entries.daily_plan_id → daily_plans.id`
- `journal_entries.profile_id → profiles.id`
- `milestones.profile_id → profiles.id`
- `milestones.season_id → seasons.id`
- `notification_prefs.profile_id → profiles.id`
- `practice_assignments.daily_plan_id → daily_plans.id`
- `profile_content_installs.profile_id → profiles.id`
- `recovery_logs.daily_plan_id → daily_plans.id`
- `recovery_targets.daily_plan_id → daily_plans.id`
- `safety_clearances.profile_id → profiles.id`
- `scripture_texts.reference_id → scripture_references.reference_id`
- `scripture_texts.translation_id → scripture_translations.translation_id`
- `season_foci.season_id → seasons.id`
- `season_recommendations.profile_id → profiles.id`
- `season_recommendations.source_assessment_id → assessments.id`
- `season_recommendations.source_season_id → seasons.id`
- `season_weeks.season_id → seasons.id`
- `seasons.profile_id → profiles.id`
- `seasons.source_assessment_id → assessments.id`
- `sync_cursors.profile_id → profiles.id`
- `sync_tombstones.profile_id → profiles.id`
- `weekly_reviews.profile_id → profiles.id`
- `weekly_reviews.season_id → seasons.id`
- `workout_logs.daily_plan_id → daily_plans.id`
- `workout_logs.profile_id → profiles.id`

### RLS policies (124)
- `assessment_domain_scores.assessment_domain_scores_delete_own`
- `assessment_domain_scores.assessment_domain_scores_insert_own`
- `assessment_domain_scores.assessment_domain_scores_select_own`
- `assessment_domain_scores.assessment_domain_scores_update_own`
- `assessments.assessments_delete_own`
- `assessments.assessments_insert_own`
- `assessments.assessments_select_own`
- `assessments.assessments_update_own`
- `body_metrics.body_metrics_delete_own`
- `body_metrics.body_metrics_insert_own`
- `body_metrics.body_metrics_select_own`
- `body_metrics.body_metrics_update_own`
- `check_ins.check_ins_delete_own`
- `check_ins.check_ins_insert_own`
- `check_ins.check_ins_select_own`
- `check_ins.check_ins_update_own`
- `coach_memory_items.coach_memory_items_delete_own`
- `coach_memory_items.coach_memory_items_insert_own`
- `coach_memory_items.coach_memory_items_select_own`
- `coach_memory_items.coach_memory_items_update_own`
- `coach_messages.coach_messages_delete_own`
- `coach_messages.coach_messages_insert_own`
- `coach_messages.coach_messages_select_own`
- `coach_messages.coach_messages_update_own`
- `coach_recommendations.coach_recommendations_delete_own`
- `coach_recommendations.coach_recommendations_insert_own`
- `coach_recommendations.coach_recommendations_select_own`
- `coach_recommendations.coach_recommendations_update_own`
- `coach_threads.coach_threads_delete_own`
- `coach_threads.coach_threads_insert_own`
- `coach_threads.coach_threads_select_own`
- `coach_threads.coach_threads_update_own`
- `coach_usage_daily.coach_usage_daily_delete_own`
- `coach_usage_daily.coach_usage_daily_insert_own`
- `coach_usage_daily.coach_usage_daily_select_own`
- `coach_usage_daily.coach_usage_daily_update_own`
- `consents.consents_delete_own`
- `consents.consents_insert_own`
- `consents.consents_select_own`
- `consents.consents_update_own`
- `content_packs.content_packs_select_published`
- `daily_plans.daily_plans_delete_own`
- `daily_plans.daily_plans_insert_own`
- `daily_plans.daily_plans_select_own`
- `daily_plans.daily_plans_update_own`
- `evidence_notes.evidence_notes_delete_own`
- `evidence_notes.evidence_notes_insert_own`
- `evidence_notes.evidence_notes_select_own`
- `evidence_notes.evidence_notes_update_own`
- `growth_snapshots.growth_snapshots_delete_own`
- `growth_snapshots.growth_snapshots_insert_own`
- `growth_snapshots.growth_snapshots_select_own`
- `growth_snapshots.growth_snapshots_update_own`
- `journal_entries.journal_entries_delete_own`
- `journal_entries.journal_entries_insert_own`
- `journal_entries.journal_entries_select_own`
- `journal_entries.journal_entries_update_own`
- `milestones.milestones_delete_own`
- `milestones.milestones_insert_own`
- `milestones.milestones_select_own`
- `milestones.milestones_update_own`
- `notification_prefs.notification_prefs_delete_own`
- `notification_prefs.notification_prefs_insert_own`
- `notification_prefs.notification_prefs_select_own`
- `notification_prefs.notification_prefs_update_own`
- `practice_assignments.practice_assignments_delete_own`
- `practice_assignments.practice_assignments_insert_own`
- `practice_assignments.practice_assignments_select_own`
- `practice_assignments.practice_assignments_update_own`
- `profile_content_installs.profile_content_installs_delete_own`
- `profile_content_installs.profile_content_installs_insert_own`
- `profile_content_installs.profile_content_installs_select_own`
- `profile_content_installs.profile_content_installs_update_own`
- `profiles.profiles_delete_own`
- `profiles.profiles_insert_own`
- `profiles.profiles_select_own`
- `profiles.profiles_update_own`
- `recovery_logs.recovery_logs_delete_own`
- `recovery_logs.recovery_logs_insert_own`
- `recovery_logs.recovery_logs_select_own`
- `recovery_logs.recovery_logs_update_own`
- `recovery_targets.recovery_targets_delete_own`
- `recovery_targets.recovery_targets_insert_own`
- `recovery_targets.recovery_targets_select_own`
- `recovery_targets.recovery_targets_update_own`
- `safety_clearances.safety_clearances_delete_own`
- `safety_clearances.safety_clearances_insert_own`
- `safety_clearances.safety_clearances_select_own`
- `safety_clearances.safety_clearances_update_own`
- `scripture_references.scripture_references_select_all`
- `scripture_texts.scripture_texts_select_all`
- `scripture_translations.scripture_translations_select_all`
- `season_foci.season_foci_delete_own`
- `season_foci.season_foci_insert_own`
- `season_foci.season_foci_select_own`
- `season_foci.season_foci_update_own`
- `season_recommendations.season_recommendations_delete_own`
- `season_recommendations.season_recommendations_insert_own`
- `season_recommendations.season_recommendations_select_own`
- `season_recommendations.season_recommendations_update_own`
- `season_weeks.season_weeks_delete_own`
- `season_weeks.season_weeks_insert_own`
- `season_weeks.season_weeks_select_own`
- `season_weeks.season_weeks_update_own`
- `seasons.seasons_delete_own`
- `seasons.seasons_insert_own`
- `seasons.seasons_select_own`
- `seasons.seasons_update_own`
- `sync_cursors.sync_cursors_delete_own`
- `sync_cursors.sync_cursors_insert_own`
- `sync_cursors.sync_cursors_select_own`
- `sync_cursors.sync_cursors_update_own`
- `sync_tombstones.sync_tombstones_delete_own`
- `sync_tombstones.sync_tombstones_insert_own`
- `sync_tombstones.sync_tombstones_select_own`
- `sync_tombstones.sync_tombstones_update_own`
- `weekly_reviews.weekly_reviews_delete_own`
- `weekly_reviews.weekly_reviews_insert_own`
- `weekly_reviews.weekly_reviews_select_own`
- `weekly_reviews.weekly_reviews_update_own`
- `workout_logs.workout_logs_delete_own`
- `workout_logs.workout_logs_insert_own`
- `workout_logs.workout_logs_select_own`
- `workout_logs.workout_logs_update_own`

### Warnings / failures
- None — core + RLS/fixes migrations applied and reapplied cleanly.

## 2. Seed result

- Pack: `season.patience-under-pressure@1.0.0`
- Theme: **Patience Under Pressure**
- Weeks: 6; representative days: 11
- Teachings (Jesus-primary): 4
- Scripture refs / WEB texts: 9 / 9
- Coach intents: 10
- Morning variants: 18
- Seeded into `content_packs`, `scripture_references`, `scripture_texts`

## 3. Harness result

- Passed: **41**
- Failed: **0**

| Check | Result | Detail |
|---|---|---|
| migration order | PASS | Legacy path_* → formation_core_v1 → formation_rls_and_fixes. Staging applies the two formation migrations on empty DB (legacy depends on auth.users). |
| required extensions | PASS | pgcrypto for gen_random_uuid() — declared in migration |
| FK dependency order | PASS | profiles → consents/assessments/seasons → daily_plans → check_ins/logs; scripture_translations → scripture_texts |
| enum/constraint order | PASS | No Postgres ENUMs; CHECK constraints inline at CREATE TABLE |
| rollback limitations | PASS | Forward-only SQL with IF NOT EXISTS; no down migration. Rollback = drop schema / restore empty project. |
| harness env vars | PASS | None required for PGlite path. Optional STAGING_DATABASE_URL reserved for future remote staging. |
| migration applied to empty database | PASS | core + RLS/fixes |
| migration reapplies cleanly (second exec) | PASS |  |
| tables created | PASS | 34 |
| enums created | PASS | none (CHECK constraints used instead) |
| indexes created | PASS | 58 |
| foreign keys created | PASS | 45 |
| RLS policies created | PASS | 124 |
| assessment_domain_scores.focus_key NULL-safe | PASS | NOT NULL default empty |
| secondary indexes present | PASS | seasons_profile_id_status_idx |
| seed content_packs row | PASS | season.patience-under-pressure@1.0.0 |
| seed scripture_texts rows | PASS | 9 |
| manifest schema | PASS |  |
| season pack schema | PASS |  |
| content-pack integrity checksum | PASS |  |
| version compatibility | PASS | season.patience-under-pressure@1.0.0 |
| manifest kind is season | PASS |  |
| offline-safe scripture texts | PASS | 9 WEB passages |
| scripture texts reference approved sources | PASS |  |
| licensing boundary reject unapproved translation | PASS | esv blocked without license row |
| teachings of Jesus prioritized as primary lens | PASS |  |
| supporting scripture does not bypass Jesus | PASS |  |
| every coach intent traces grounding to Scripture with Jesus priority | PASS |  |
| paraphrases are labeled as paraphrases | PASS |  |
| every workout references valid exercises | PASS |  |
| season has valid reassessment point | PASS | week 6 |
| all six week definitions present | PASS |  |
| representative days cover all weeks | PASS |  |
| every day has valid minimum Morning (all modes) | PASS |  |
| busy-day content preserves Scripture, intention, body action, prayer | PASS |  |
| missing optional sections allowed (journal/midday) | PASS |  |
| workout and recovery variations present | PASS |  |
| invalid packs fail with actionable checksum error | PASS | expected 00000000… got 27cb4dc0… |
| content-pack version bump is discrete/atomic unit | PASS | 1.0.0 → 1.0.1 |
| ask_coach grounded to Jesus-primary policy | PASS |  |
| harness runs without production feature UI | PASS | scripts/staging-validation.mjs only |

## 4. Failed tests

- None

## 5. Schema weaknesses discovered

- Prior blockers addressed (RLS, NULL-safe focus_key, secondary indexes).

Remaining notes:
- Growth Mirror tables remain deferred (by design).
- `notification_prefs.times` has no JSON shape constraint yet.
- No down-migration; staging reset = empty DB recreate.
- Cloud Supabase staging re-apply still recommended when credentials/Docker available.

## 6. Content-model weaknesses discovered

- None critical

Remaining notes:
- Secondary focus `self-control` is ambient; may want weekly touchpoints later.
- Paraphrase labeling is enforced in domain/harness; pack does not store paraphrase bodies yet.

## 7. Recommended edits

Staging gates cleared. Optional follow-ups:
1. Apply migrations to a real empty Supabase staging project when available.
2. Author a staging reset runbook / down migration.
3. Begin Phase 1 UI shell (Today / Journey / Growth / Coach empty states).

## 8. Exact files changed (this pass)

- `supabase/migrations/20260730000000_formation_rls_and_fixes.sql`
- `supabase/migrations/20260725000000_formation_core_v1.sql` (focus_key NOT NULL)
- `src/content/types.ts` (season pack types + `season` kind)
- `content/schemas/pack-manifest.schema.json`
- `content/packs/seasons/patience-under-pressure/manifest.json` (`kind: season`)
- `scripts/staging-validation.mjs`
- `docs/STAGING_VALIDATION_REPORT.md`

## 9. Exact commands used

```bash
npm run staging:validate
```

## 10. Ready for UI scaffolding?

**Yes — schema/content staging gates cleared; proceed to Phase 1 UI shell**

## Recommendation

### **Approve for UI scaffolding**

Proceed to Phase 1 UI shell scaffolding (navigation + empty coherent states). Keep production feature flows (full Today coaching, assessment, Ask Coach) for subsequent phases.
