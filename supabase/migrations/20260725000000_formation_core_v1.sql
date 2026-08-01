-- Formation core schema v1 (Phase 0)
-- Online source of truth for linked profiles. Product name intentionally absent.
--
-- Required extensions:
--   pgcrypto (or pg 13+ builtin) for gen_random_uuid()
-- Staging/local: CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Supabase: usually available by default; still declare for empty projects.

create extension if not exists pgcrypto;

-- Profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  timezone text not null,
  locale text not null default 'en-US',
  preferred_translation_id text,
  unit_system text not null default 'imperial' check (unit_system in ('imperial','metric')),
  time_budget jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  deleted_at timestamptz
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null,
  granted boolean not null,
  granted_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id, kind)
);

create table if not exists safety_clearances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  questionnaire_version text not null,
  answers jsonb not null,
  status text not null check (status in ('cleared','restricted','needs_medical_clearance')),
  restrictions text[] not null default '{}',
  cleared_at timestamptz,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id)
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null check (kind in ('baseline','reassessment')),
  status text not null check (status in ('in_progress','completed','abandoned')),
  period_label text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  goals_text text,
  life_pressure_tags text[] not null default '{}',
  time_budget jsonb not null default '{}'::jsonb,
  raw_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table if not exists assessment_domain_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  domain text not null,
  -- Empty string = domain-level score (NULL-safe uniqueness)
  focus_key text not null default '',
  score numeric,
  scale_version text not null,
  notes text,
  unique (assessment_id, domain, focus_key)
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  status text not null check (status in ('active','grace','completed','archived')),
  week_count int not null default 6,
  start_date date not null,
  end_date date not null,
  grace_ends_on date,
  physical_template_id text not null,
  recommender_version text,
  user_goal_snapshot text,
  source_assessment_id uuid references assessments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  revision bigint not null default 1
);

create table if not exists season_foci (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  role text not null check (role in ('primary','secondary','physical')),
  focus_key text not null,
  rationale text,
  unique (season_id, role)
);

create table if not exists season_weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_index int not null check (week_index between 1 and 12),
  stage_key text not null,
  starts_on date not null,
  ends_on date not null,
  unique (season_id, week_index)
);

create table if not exists season_recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  source_season_id uuid references seasons(id),
  source_assessment_id uuid references assessments(id),
  proposed_primary text not null,
  proposed_secondary text not null,
  proposed_physical_template text not null,
  rationale jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending','accepted','dismissed','adjusted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  season_id uuid references seasons(id),
  kind text not null,
  occurred_on date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  season_id uuid not null references seasons(id),
  plan_date date not null,
  week_index int not null,
  stage_key text not null,
  morning_mode text check (morning_mode in ('full','short','two_minute')),
  content_snapshot jsonb not null,
  morning_status text not null default 'pending'
    check (morning_status in ('pending','in_progress','completed','skipped')),
  midday_status text not null default 'pending'
    check (midday_status in ('pending','in_progress','completed','skipped','disabled')),
  evening_status text not null default 'pending'
    check (evening_status in ('pending','in_progress','completed','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id, plan_date)
);

create table if not exists practice_assignments (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  assignment_pack_id text not null,
  prompt_text text not null,
  focus_key text not null,
  expected_test text,
  context_tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (daily_plan_id)
);

create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  stage text not null check (stage in ('morning','midday','evening')),
  status text not null check (status in ('draft','completed','skipped')),
  emotion text,
  was_tested boolean,
  responses jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  draft_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (daily_plan_id, stage)
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  daily_plan_id uuid references daily_plans(id),
  check_in_id uuid references check_ins(id),
  source text not null,
  body text not null,
  themes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  deleted_at timestamptz
);

create table if not exists evidence_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  daily_plan_id uuid references daily_plans(id),
  season_id uuid references seasons(id),
  kind text not null check (kind in ('growth','miss','lesson','gratitude','repentance')),
  body text not null,
  domains text[] not null default '{}',
  focus_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  deleted_at timestamptz
);

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  season_id uuid not null references seasons(id),
  week_index int not null,
  summary_structured jsonb not null default '{}'::jsonb,
  summary_narrative text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (season_id, week_index)
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  template_session_id text,
  status text not null check (status in ('prescribed','completed','partial','skipped','swapped_recovery')),
  rpe numeric,
  pain_flag boolean not null default false,
  pain_notes text,
  duration_min int,
  performed jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (daily_plan_id)
);

create table if not exists recovery_targets (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  sleep_hours_target numeric,
  hydration_units_target numeric,
  protein_grams_target numeric,
  movement_minutes_target numeric,
  nutrition_guidance_id text,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (daily_plan_id)
);

create table if not exists recovery_logs (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  sleep_hours numeric,
  sleep_quality int check (sleep_quality between 1 and 5),
  hydration_units numeric,
  protein_grams numeric,
  protein_hit boolean,
  movement_minutes numeric,
  energy int check (energy between 1 and 5),
  soreness int check (soreness between 1 and 5),
  notes text,
  logged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (daily_plan_id)
);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  recorded_on date not null,
  weight numeric,
  waist numeric,
  unit_system text not null,
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id, recorded_on, source)
);

create table if not exists growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  snapshot_on date not null,
  physical jsonb not null default '{}'::jsonb,
  recovery jsonb not null default '{}'::jsonb,
  practices jsonb not null default '{}'::jsonb,
  character jsonb not null default '{}'::jsonb,
  application jsonb not null default '{}'::jsonb,
  framing_notes text,
  created_at timestamptz not null default now(),
  unique (profile_id, snapshot_on)
);

create table if not exists coach_memory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null,
  body text not null,
  source text not null check (source in ('user_stated','derived_review','assessment')),
  confidence text not null check (confidence in ('stated','suggested')),
  season_id uuid references seasons(id),
  expires_on date,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  revision bigint not null default 1
);

create table if not exists coach_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  mode text not null check (mode in ('structured','ask_coach')),
  intent_key text,
  season_id uuid references seasons(id),
  daily_plan_id uuid references daily_plans(id),
  status text not null check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references coach_threads(id) on delete cascade,
  role text not null check (role in ('user','coach','system')),
  body text not null,
  citations jsonb not null default '[]'::jsonb,
  safety_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists coach_recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null,
  title text not null,
  body text not null,
  action jsonb,
  status text not null check (status in ('active','acted','dismissed','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table if not exists coach_usage_daily (
  profile_id uuid not null references profiles(id),
  usage_date date not null,
  ask_threads_started int not null default 0,
  ask_substantial_exchanges int not null default 0,
  grace_used int not null default 0,
  primary key (profile_id, usage_date)
);

create table if not exists notification_prefs (
  profile_id uuid primary key references profiles(id),
  mode text not null check (mode in ('light','standard','active')),
  midday_enabled boolean not null default false,
  active_days int[] not null default '{1,2,3,4,5,6,0}',
  times jsonb not null,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table if not exists content_packs (
  pack_id text not null,
  version text not null,
  schema_version text not null,
  kind text not null,
  locale text not null,
  publication_status text not null check (publication_status in ('draft','review','published','yanked')),
  translation_dependencies text[] not null default '{}',
  content_owner text not null,
  review_status text not null,
  checksum_sha256 text not null,
  min_app_version text not null,
  release_notes text,
  bundle_path text,
  published_at timestamptz,
  primary key (pack_id, version)
);

create table if not exists profile_content_installs (
  profile_id uuid not null references profiles(id),
  pack_id text not null,
  version text not null,
  source text not null check (source in ('bundled','remote')),
  installed_at timestamptz not null default now(),
  primary key (profile_id, pack_id)
);

create table if not exists scripture_translations (
  translation_id text primary key,
  name text not null,
  license_kind text not null,
  allows_digital boolean not null,
  allows_offline boolean not null,
  allows_ai_display boolean not null,
  allows_commercial boolean not null,
  max_quotation_policy text,
  attribution_text text not null,
  pack_id text,
  notes text
);

create table if not exists scripture_references (
  reference_id text primary key,
  book_code text not null,
  chapter int not null,
  verse_start int not null,
  verse_end int not null,
  canonical_label text not null
);

create table if not exists scripture_texts (
  reference_id text not null references scripture_references(reference_id),
  translation_id text not null references scripture_translations(translation_id),
  text_body text not null,
  attribution_required boolean not null default true,
  pack_id text not null,
  pack_version text not null,
  primary key (reference_id, translation_id)
);

create table if not exists sync_cursors (
  profile_id uuid primary key references profiles(id),
  server_revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  deleted_at timestamptz not null default now(),
  revision bigint not null
);

-- Seed public-domain translation metadata (WEB)
insert into scripture_translations (
  translation_id, name, license_kind,
  allows_digital, allows_offline, allows_ai_display, allows_commercial,
  attribution_text, notes
) values (
  'web',
  'World English Bible',
  'public_domain',
  true, true, true, true,
  'World English Bible (public domain)',
  'Development and foundation-pack default until licensed translations are added.'
) on conflict (translation_id) do nothing;
