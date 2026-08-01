# Technical Design Document

**Product (working name):** Path  
**Status:** Approved 2026-07-25 — Phase 0 accepted; staging gates green (2026-07-30); Phase 1 UI shell started (`/today` `/journey` `/growth` `/coach`)  
**North Star:** *Who are you becoming?*

Every architectural decision must answer: **Does this help users become who they are training to become?**  
If not, simplify or remove it.

---

## Table of contents

1. [Locked product decisions](#1-locked-product-decisions)
2. [Resolved architecture defaults](#2-resolved-architecture-defaults)
3. [Product architecture](#3-product-architecture)
4. [Folder structure](#4-folder-structure)
5. [Domain model](#5-domain-model)
6. [Concrete database schema](#6-concrete-database-schema)
7. [Local and remote data ownership](#7-local-and-remote-data-ownership)
8. [Sync and conflict-resolution rules](#8-sync-and-conflict-resolution-rules)
9. [State management](#9-state-management)
10. [Content-pack schema and versioning](#10-content-pack-schema-and-versioning)
11. [Scripture licensing boundary](#11-scripture-licensing-boundary)
12. [Today screen — wire-level IA](#12-today-screen--wire-level-ia)
13. [Coach intent model and guardrails](#13-coach-intent-model-and-guardrails)
14. [Offline and failure-state behavior](#14-offline-and-failure-state-behavior)
15. [Notifications](#15-notifications)
16. [Safety and privacy](#16-safety-and-privacy)
17. [Migration from current app](#17-migration-from-current-app)
18. [Phase 0 scaffolding plan](#18-phase-0-scaffolding-plan)
19. [Later phases](#19-later-phases)
20. [Architecture review checklist](#20-architecture-review-checklist)

---

## 1. Locked product decisions

| Decision | Choice |
|---|---|
| Brand | Temporary working name “Path”; isolated in `brand/`; rename-ready |
| Body track | 3 curated templates only; extensible for custom later |
| Seasons | Assessment-driven 6-week seasons; primary + secondary formation + physical focus |
| Reassessment | Soft prompt + grace period; never lock out |
| Daily rhythm | Morning + Evening core; Midday optional in Standard |
| Navigation | Today · Journey · Growth · Coach |
| Launch | Both tracks together in one Morning composition |
| v1 inputs | Sleep, workouts, movement, hydration, protein/nutrition |
| Relationships | Via assignments/reflections only — no relationship CRM |
| Coach | 90% proactive structured coaching · 10% Ask Coach |
| Metrics | Formation evidence, not streaks/completion scores |
| Journey | *Where am I going?* (directional) |
| Growth | *How am I changing?* (evidence) |

---

## 2. Resolved architecture defaults

Former §16 open questions — now locked:

| Topic | Decision |
|---|---|
| Local cache | **IndexedDB** behind a storage adapter; no direct IDB access in features |
| Server-state cache | **TanStack Query** for remote state; no custom cache; no large global store |
| Scripture | Licensing is a first-class constraint; reference ≠ text; public-domain/permitted for dev |
| Ask Coach | Soft ~10 user-initiated threads/substantial exchanges per day; grace, not hard stop |
| Busy-day Morning | User-triggered Full / Short / Two-minute reset; app may recommend, user chooses |
| Body metrics (Growth) | Limited set at launch; weight optional and non-dominant |
| Content delivery | Hybrid: foundational pack bundled + atomic remote pack updates |

**Persistence split:**

```text
TanStack Query     → remote/server state (fetch, dedupe, stale, retry, optimistic, invalidation)
UI / feature state → interface-only (expand/collapse, selected session, modals)
Storage adapter    → IndexedDB persisted offline data + outbox
```

---

## 3. Product architecture

### 3.1 High-level

```text
┌──────────────────────────────────────────────────────────────────┐
│                         Client (PWA)                              │
│  Today · Journey · Growth · Coach                                 │
│  brand/ · ui/ · features/ · domain/ · data/                       │
└───────────────┬──────────────────────────────┬───────────────────┘
                │                              │
     StorageAdapter (interface)         TanStack Query
                │                              │
                ▼                              ▼
┌───────────────────────────┐     ┌────────────────────────────────┐
│ IndexedDB (v1 impl)       │     │ API (serverless)               │
│ drafts · cache · outbox   │     │ auth · plans · coach · sync    │
│ content pack store        │     │ content registry · push        │
└───────────────────────────┘     └───────────────┬────────────────┘
                                                  │
                ┌─────────────────────────────────┼────────────────────────┐
                ▼                                 ▼                        ▼
        ┌──────────────┐              ┌────────────────────┐     ┌─────────────────┐
        │ Postgres     │              │ Content registry   │     │ Model provider  │
        │ (Supabase)   │              │ + object storage   │     │ (server-only)   │
        │ SoT online   │              │ versioned packs    │     └─────────────────┘
        └──────────────┘              └────────────────────┘
```

**Future swap:** `StorageAdapter` may gain a SQLite/native implementation without changing repositories.

### 3.2 Principles

1. Formation over completion  
2. One day, two tracks (`daily_plans`)  
3. Content is data (versioned packs)  
4. AI narrates; packs + licensed scripture canonize  
5. Coach leads (proactive > chat)  
6. Brand is config  
7. Safety in domain policies  
8. Scripture reference independent of translation text  
9. Offline Today must still train (bundled foundation pack)  
10. Extensibility without shipping unused product surface  

### 3.3 Runtime shape

| Layer | Choice | Role |
|---|---|---|
| Client | React 19 + Vite PWA | Daily coaching UX |
| Routing | React Router | Tabs + notification deep links |
| Local persistence | IndexedDB via `StorageAdapter` | Offline cache, drafts, outbox, packs |
| Server state | TanStack Query | Remote fetch/mutation lifecycle |
| API | Typed serverless routes | Auth’d CRUD, AI proxy, sync, content |
| DB | Supabase Postgres + RLS | Online source of truth |
| Auth | Supabase Auth (Apple/Google) + local profile until signup | Low-friction start |
| Jobs | Cron | Reminders, grace reassessment nudges |
| AI | Server-side only | Structured intents + Ask Coach |

---

## 4. Folder structure

```text
src/
  brand/                          # ONLY product display name / taglines
  app/                            # shell, routes, providers (QueryClient)
  ui/                             # primitives (SessionSection, etc.)
  domain/                         # pure TS — no React, no I/O
    formation/
    training/
    recovery/
    assessment/
    evidence/
    safety/
    coaching/
    scripture/                    # reference model, paraphrase rules
    notifications/
    sync/                         # conflict policies (pure)
    northStar.ts
  content/
    bundled/                      # foundational pack(s) imported at build
    runtime/                      # loader, resolver, integrity verify
    types.ts
  data/
    storage/
      StorageAdapter.ts           # interface
      indexedDbAdapter.ts         # v1 implementation
      types.ts
    repositories/                 # feature-facing; never import IDB APIs
    sync/
      outbox.ts
      reconciler.ts
    mappers/
    api/                          # fetch clients used by TanStack Query
  features/
    today/
    journey/
    growth/
    coach/
    onboarding/
    settings/
    notifications/

api/
  _lib/
    auth.ts
    content.ts
    ai/
    safety/
    push/
    sync/
  ...

content/                          # authoring SoT in repo
  schemas/
  packs/
    foundation/                   # bundled
    remote-candidates/            # authored here, published via registry
  scripture/
    translations/                 # per-license packs
    references/                   # canonical reference catalog (no copyrighted text required)

supabase/migrations/
docs/TECHNICAL_DESIGN.md
```

**Hard rules**

- Features import `data/repositories/*`, never `indexedDB` / `IDBFactory`.  
- Sibling features do not import each other’s internals.  
- Product name appears only under `src/brand/`.

---

## 5. Domain model

### 5.1 Ubiquitous language

| Term | Meaning |
|---|---|
| Season | 6-week personalized training period |
| Primary / secondary focus | Formation emphases |
| Physical focus | Maps to a curated workout template |
| Daily plan | Integrated plan for one date |
| Morning mode | `full` \| `short` \| `two_minute` (user-chosen) |
| Assignment | Practical righteousness practice |
| Check-in | Morning / midday / evening response block |
| Evidence note | Growth, miss, lesson, gratitude, repentance |
| Scripture reference | Canonical locator (book/chapter/verse), translation-agnostic |
| Translation text | Licensed (or public-domain) wording for a reference |
| Content pack | Versioned, atomic content unit |
| Outbox | Queued local mutations awaiting sync |

### 5.2 Aggregates

```text
Profile
  ├── SafetyClearance
  ├── NotificationPrefs
  ├── ContentInstallations[]        # which pack versions are active locally
  ├── Seasons[]
  │     ├── SeasonFoci
  │     ├── SeasonWeeks[1..6]
  │     └── DailyPlans[]
  │           ├── PracticeAssignment
  │           ├── PrescribedWorkout?
  │           ├── RecoveryTargets
  │           └── CheckIns
  ├── Assessments[]
  ├── EvidenceNotes[] / JournalEntries[]
  ├── BodyMetrics[] / GrowthSnapshots[]
  ├── CoachThreads[] / CoachMemoryItems[]
  └── GrowthMirrorCycles[] (future)
```

### 5.3 Season week stages

| Week | `stage_key` |
|---|---|
| 1 | `understand` |
| 2 | `notice` |
| 3 | `practice` |
| 4 | `practice_under_difficulty` |
| 5 | `apply_in_relationships` |
| 6 | `reflect_and_reassess` |

### 5.4 MVP workout templates

1. `full_body_foundations` — beginner, 3×/week  
2. `strength_foundations` — intermediate, 3×/week  
3. `recovery_mobility` — recovery, mobility, walking  

---

## 6. Concrete database schema

Postgres is the **online source of truth** for authenticated users.  
Local-only profiles may exist entirely in IndexedDB until cloud link.

Conventions:

- `uuid` PKs for user data; `text` PKs for content ids  
- `created_at` / `updated_at` timestamptz on mutable rows  
- `revision bigint` monotonic per row for sync  
- RLS: `profile_id` must belong to `auth.uid()` (via `profiles.auth_user_id`)  
- No product name in table names  

### 6.1 Identity, consent, safety

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,                    -- null until cloud link
  display_name text not null,
  timezone text not null,
  locale text not null default 'en-US',
  preferred_translation_id text,               -- e.g. 'web' | future licensed ids
  unit_system text not null default 'imperial' check (unit_system in ('imperial','metric')),
  time_budget jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  deleted_at timestamptz
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null,                          -- ai_coaching | health_data | cloud_sync | sensitive_domains_ai
  granted boolean not null,
  granted_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id, kind)
);

create table safety_clearances (
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
```

### 6.2 Assessments

```sql
create table assessments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null check (kind in ('baseline','reassessment')),
  status text not null check (status in ('in_progress','completed','abandoned')),
  period_label text,                           -- prior_4_weeks
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

create table assessment_domain_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  domain text not null,                        -- physical_capacity | recovery_health |
                                               -- training_consistency | spiritual_practices |
                                               -- character_patterns | life_application
  focus_key text,                              -- when domain = character_patterns
  score numeric,                               -- NEVER aggregated into one spiritual score
  scale_version text not null,
  notes text,
  unique (assessment_id, domain, focus_key)
);

-- INVARIANT: no profiles.spiritual_score / no composite godliness score table
```

### 6.3 Seasons and journey

```sql
create table seasons (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  status text not null check (status in ('active','grace','completed','archived')),
  week_count int not null default 6,
  start_date date not null,
  end_date date not null,
  grace_ends_on date,                          -- typically end_date + 14 days
  physical_template_id text not null,
  recommender_version text,
  user_goal_snapshot text,
  source_assessment_id uuid references assessments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  revision bigint not null default 1
);

create table season_foci (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  role text not null check (role in ('primary','secondary','physical')),
  focus_key text not null,
  rationale text,
  unique (season_id, role)
);

create table season_weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_index int not null check (week_index between 1 and 12),
  stage_key text not null,
  starts_on date not null,
  ends_on date not null,
  unique (season_id, week_index)
);

create table season_recommendations (
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

create table milestones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  season_id uuid references seasons(id),
  kind text not null,
  occurred_on date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

### 6.4 Daily plans, reflections, journal, evidence

```sql
create table daily_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  season_id uuid not null references seasons(id),
  plan_date date not null,
  week_index int not null,
  stage_key text not null,
  morning_mode text check (morning_mode in ('full','short','two_minute')),
  content_snapshot jsonb not null,             -- resolved pack ids + scripture refs + prompts
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

create table practice_assignments (
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

create table check_ins (
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

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  daily_plan_id uuid references daily_plans(id),
  check_in_id uuid references check_ins(id),
  source text not null,                        -- evening_reflection | morning_notes | coach | standalone
  body text not null,
  themes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  deleted_at timestamptz
);

create table evidence_notes (
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

create table weekly_reviews (
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
```

### 6.5 Workouts and exercises

```sql
-- Content mirrors (optional online index); packs remain canonical for prescription text
create table exercises (
  id text primary key,
  name text not null,
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  contraindications text[] not null default '{}',
  demo_ref text,
  pack_id text not null,
  pack_version text not null
);

create table workout_templates (
  id text primary key,
  name text not null,
  level text not null check (level in ('beginner','intermediate','recovery')),
  days_per_week int not null,
  source text not null default 'curated' check (source in ('curated','custom')),
  pack_id text not null,
  pack_version text not null,
  meta jsonb not null default '{}'::jsonb
);

create table workout_template_sessions (
  id text primary key,
  template_id text not null references workout_templates(id),
  day_index int not null,
  title text not null,
  session_kind text not null check (session_kind in ('strength','mobility','walk','recovery')),
  prescription jsonb not null,
  unique (template_id, day_index)
);

create table workout_logs (
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
```

### 6.6 Recovery, nutrition, body metrics, growth

```sql
create table recovery_targets (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  sleep_hours_target numeric,
  hydration_units_target numeric,
  protein_grams_target numeric,
  movement_minutes_target numeric,
  nutrition_guidance_id text,                  -- content pack pointer
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (daily_plan_id)
);

create table recovery_logs (
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

create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  recorded_on date not null,
  weight numeric,                              -- optional; never dominant in Growth UX
  waist numeric,                               -- reserved; not emphasized in v1 UI
  unit_system text not null,
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id, recorded_on, source)
);

create table growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  snapshot_on date not null,
  physical jsonb not null default '{}'::jsonb,     -- completion, consistency, progression proxies
  recovery jsonb not null default '{}'::jsonb,     -- sleep, energy
  practices jsonb not null default '{}'::jsonb,    -- context only
  character jsonb not null default '{}'::jsonb,
  application jsonb not null default '{}'::jsonb,
  framing_notes text,
  created_at timestamptz not null default now(),
  unique (profile_id, snapshot_on)
);
```

**Growth v1 surfaces (from these tables + logs):** workout completion, training consistency, strength/exercise progression, movement, sleep (when entered), energy/recovery, optional weight.  
**Deferred:** body-comp estimates, advanced charts, wearables, calorie tracking, extensive measurements, automated health scoring.

### 6.7 Coach, memory, usage

```sql
create table coach_memory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null,                          -- preference | constraint | season_theme |
                                               -- recurring_struggle | win_pattern | safety_note
  body text not null,
  source text not null check (source in ('user_stated','derived_review','assessment')),
  confidence text not null check (confidence in ('stated','suggested')),
  season_id uuid references seasons(id),
  expires_on date,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  revision bigint not null default 1
);

create table coach_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  mode text not null check (mode in ('structured','ask_coach')),
  intent_key text,                             -- required for structured
  season_id uuid references seasons(id),
  daily_plan_id uuid references daily_plans(id),
  status text not null check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table coach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references coach_threads(id) on delete cascade,
  role text not null check (role in ('user','coach','system')),
  body text not null,
  citations jsonb not null default '[]'::jsonb,
  safety_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table coach_recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  kind text not null,                          -- daily | weekly | season | reset | busy_morning
  title text not null,
  body text not null,
  action jsonb,
  status text not null check (status in ('active','acted','dismissed','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

-- Soft Ask Coach budget (no token/cost language exposed to users)
create table coach_usage_daily (
  profile_id uuid not null references profiles(id),
  usage_date date not null,
  ask_threads_started int not null default 0,
  ask_substantial_exchanges int not null default 0,
  grace_used int not null default 0,
  primary key (profile_id, usage_date)
);
```

### 6.8 Notifications

```sql
create table notification_prefs (
  profile_id uuid primary key references profiles(id),
  mode text not null check (mode in ('light','standard','active')),
  midday_enabled boolean not null default false,
  active_days int[] not null default '{1,2,3,4,5,6,0}',
  times jsonb not null,                        -- { morning, midday, evening, workout }
  updated_at timestamptz not null default now(),
  revision bigint not null default 1
);

create table push_subscriptions (
  endpoint text primary key,
  profile_id uuid not null references profiles(id),
  p256dh text not null,
  auth_key text not null,
  timezone text not null,
  updated_at timestamptz not null default now()
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  planned_for timestamptz not null,
  kind text not null,
  status text not null,                        -- sent | failed | suppressed
  context_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);
```

### 6.9 Content registry (remote)

```sql
create table content_packs (
  pack_id text not null,
  version text not null,                       -- semver
  schema_version text not null,
  kind text not null,
  locale text not null,
  publication_status text not null check (publication_status in ('draft','review','published','yanked')),
  translation_dependencies text[] not null default '{}',
  content_owner text not null,
  review_status text not null,                 -- unreviewed | theologically_reviewed | legal_reviewed
  checksum_sha256 text not null,
  min_app_version text not null,
  release_notes text,
  bundle_path text,                            -- object storage key
  published_at timestamptz,
  primary key (pack_id, version)
);

create table profile_content_installs (
  profile_id uuid not null references profiles(id),
  pack_id text not null,
  version text not null,
  source text not null check (source in ('bundled','remote')),
  installed_at timestamptz not null default now(),
  primary key (profile_id, pack_id)
);
```

### 6.10 Scripture licensing tables

```sql
create table scripture_translations (
  translation_id text primary key,             -- 'web', future licensed ids
  name text not null,
  license_kind text not null,                  -- public_domain | licensed | forbidden_bundle
  allows_digital boolean not null,
  allows_offline boolean not null,
  allows_ai_display boolean not null,
  allows_commercial boolean not null,
  max_quotation_policy text,                   -- human-readable / structured later
  attribution_text text not null,
  pack_id text,                                -- translation text pack, if any
  notes text
);

-- Canonical references — no verse body required here
create table scripture_references (
  reference_id text primary key,               -- 'matt.5.3-12'
  book_code text not null,
  chapter int not null,
  verse_start int not null,
  verse_end int not null,
  canonical_label text not null                -- 'Matthew 5:3-12'
);

-- Licensed or permitted text, keyed by translation
create table scripture_texts (
  reference_id text not null references scripture_references(reference_id),
  translation_id text not null references scripture_translations(translation_id),
  text_body text not null,
  attribution_required boolean not null default true,
  pack_id text not null,
  pack_version text not null,
  primary key (reference_id, translation_id)
);
```

Client content packs mirror this separation even when served from files rather than these tables.

### 6.11 Growth Mirror (reserved, not MVP UI)

```sql
create table growth_mirror_cycles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  status text not null check (status in ('collecting','ready','closed')),
  min_responses int not null default 3,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);

create table growth_mirror_invites (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references growth_mirror_cycles(id) on delete cascade,
  role_label text not null,
  token_hash text not null unique,
  revoked boolean not null default false
);

create table growth_mirror_responses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references growth_mirror_cycles(id) on delete cascade,
  answers jsonb not null,
  free_text_redacted text,
  received_at timestamptz not null default now()
  -- no respondent identity; clients never receive ordered raw dumps
);

create table growth_mirror_summaries (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references growth_mirror_cycles(id) on delete cascade,
  themes jsonb not null,
  alignment jsonb not null,
  narrative text not null,
  created_at timestamptz not null default now()
);
```

### 6.12 Sync support

```sql
create table sync_cursors (
  profile_id uuid primary key references profiles(id),
  server_revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Optional tombstones for deleted user artifacts
create table sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  deleted_at timestamptz not null default now(),
  revision bigint not null
);
```

---

## 7. Local and remote data ownership

### 7.1 Sources of truth

| Condition | Source of truth |
|---|---|
| No cloud account | IndexedDB (local profile) |
| Cloud linked + online | Postgres |
| Cloud linked + offline | IndexedDB cache + outbox; reconcile on reconnect |

### 7.2 Ownership matrix

| Data | Local (IDB) | Remote (Postgres) | Writer |
|---|---|---|---|
| Profile skeleton | yes | yes (if linked) | Profile repo |
| Safety / consents | yes | yes | Onboarding / Settings |
| Assessments | yes | yes | Assessment service |
| Seasons / foci / weeks | yes | yes | Season service |
| Daily plans + snapshots | yes (today±N cached) | yes | Plan service |
| Check-in drafts | **local authoritative until flush** | after sync | Today |
| Check-in completed | yes | yes | Today |
| Workout / recovery logs | yes | yes | Today |
| Evidence / journal | yes | yes | Today / Growth |
| Body metrics | yes | yes | Growth |
| Coach threads/messages | yes (recent) | yes | Coach |
| Coach usage daily | yes mirror | yes authoritative when linked | Coach service |
| Notification prefs | yes | yes | Settings |
| Push subscriptions | device local + remote | yes | Notifications |
| Bundled content packs | yes (built-in) | registry optional | Content runtime |
| Remote content packs | IDB pack store after atomic install | registry + blob | Content runtime |
| Scripture references | bundled catalog | optional mirror | Content |
| Scripture texts | only if license allows offline pack | according to license | Content |
| Growth Mirror | n/a MVP | reserved | future |
| UI expand/collapse | memory only | never | UI state |
| TanStack cache | memory (persist optional for non-sensitive) | n/a | Query client |

### 7.3 Storage adapter interface (contract)

```ts
// Conceptual — implement in Phase 0; no feature UI yet
interface StorageAdapter {
  get<T>(store: StoreName, key: string): Promise<T | null>
  put<T>(store: StoreName, key: string, value: T): Promise<void>
  delete(store: StoreName, key: string): Promise<void>
  query<T>(store: StoreName, index: IndexQuery): Promise<T[]>
  tx<T>(stores: StoreName[], mode: 'r' | 'rw', fn: TxFn<T>): Promise<T>
}

type StoreName =
  | 'profiles'
  | 'daily_plans'
  | 'check_ins'
  | 'outbox'
  | 'content_packs'
  | 'scripture_texts'
  | 'coach_threads'
  | 'meta'
```

Repositories depend on `StorageAdapter` + API clients.  
**No feature file may import IndexedDB APIs.**

### 7.4 IndexedDB stores (v1)

| Store | Purpose |
|---|---|
| `profiles` | Local + mirrored profile |
| `entities` | Generic versioned entity cache keyed by `type:id` |
| `daily_plans` | Hot path for Today |
| `drafts` | In-progress check-ins |
| `outbox` | Pending mutations |
| `content_packs` | Installed pack blobs + manifests |
| `scripture_texts` | Offline-permitted translation bodies only |
| `meta` | sync cursor, schema version, install state |

---

## 8. Sync and conflict-resolution rules

### 8.1 Transport

1. Client maintains `outbox` of mutations `{ entityType, entityId, patch, baseRevision, clientMutationId, createdAt }`.  
2. On network restore / interval: `POST /api/sync/push` then `GET /api/sync/pull?since=cursor`.  
3. Server applies push, returns accepted/rejected per mutation + new revisions.  
4. Pull returns changed rows + tombstones since cursor.

### 8.2 Conflict policy by entity

| Entity | Policy | Notes |
|---|---|---|
| `check_ins` drafts | **Local wins** until `status=completed` | Completing sets server row |
| `check_ins` completed | **Latest `updated_at` / revision wins** field-merge for `responses` | If both completed offline: merge responses by prompt id; prefer non-empty answers; if conflict on same prompt, prefer higher revision then local |
| `practice_assignments.expected_test` | Last writer wins | High personalization value; rare conflict |
| `workout_logs` | Last writer wins | Pain flag true always survives merge (OR semantics) |
| `recovery_logs` | Field-level LWW | Per numeric field |
| `journal_entries` / `evidence_notes` | LWW on `body` if same id; **never auto-delete** newer local draft | Deletes are tombstoned |
| `daily_plans.content_snapshot` | **Server/plan materializer wins** | Client does not author snapshots except offline bootstrap from local ContentService |
| `seasons` status transitions | Server validates FSM: `active→grace→completed` | Client cannot skip safety |
| `notification_prefs` | LWW | |
| `coach_messages` | Append-only; no silent overwrite | |
| `coach_usage_daily` | Server max() counters when linked | Prevents budget reset by stale local |
| `body_metrics` | LWW per `(date, source)` | |
| Content packs | Not sync-merged; **atomic install** only | |

### 8.3 Pain flag invariant

When merging workout logs: `pain_flag = local.pain_flag OR remote.pain_flag`.  
True never regresses to false without explicit user clear + server accept.

### 8.4 Offline plan materialization

If online plan fetch fails:

1. Use cached `daily_plans` for date if present.  
2. Else materialize locally from **bundled foundation pack** + active season foci in IDB.  
3. Mark plan `content_snapshot.meta.source = 'offline_local'`.  
4. On reconnect, server may replace snapshot **only if** morning not completed; if completed, keep snapshot used (reproducibility) and attach `server_plan_id` link.

### 8.5 Cloud link merge (first signup)

Reuse hard-won lesson from current app: **never wipe meaningful local journal with empty cloud.**

```text
if cloud empty && local meaningful → upload local
if local empty && cloud meaningful → download cloud
if both meaningful → entity merge by rules above; prefer union of journal/evidence
```

### 8.6 Idempotency

All mutations carry `clientMutationId`. Server persists ids to ignore duplicates.

---

## 9. State management

```text
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│ UI local state  │     │ TanStack Query       │     │ StorageAdapter     │
│ (ephemeral UX)  │     │ (server state)       │     │ (IndexedDB)        │
└─────────────────┘     └──────────┬───────────┘     └─────────┬──────────┘
                                   │                           │
                                   └─────────────┬─────────────┘
                                                 │
                                        repositories /
                                        sync reconciler
```

- **Do** use Query for seasons, plans, growth aggregates, coach recommendations.  
- **Do** persist drafts and outbox in IndexedDB.  
- **Don’t** put accordion state in Query or IDB.  
- **Don’t** add Redux/Zustand unless a clear cross-tree need appears.

Optimistic updates: allowed for check-in complete, workout log, recovery log; rollback on hard server reject with user-visible non-shaming toast.

---

## 10. Content-pack schema and versioning

### 10.1 Hybrid delivery

| Pack class | Delivery | Must include |
|---|---|---|
| **Foundation** (bundled) | App binary | Onboarding, first season materials, core teachings of Jesus, essential prompts, 3 workout templates, min Morning/Midday/Evening, offline fallback coaching, public-domain scripture texts used in foundation |
| **Expansion** (remote) | Atomic download | New seasons/themes, corrections, more workouts, licensed translation packs, reviewed theological updates |

### 10.2 Manifest (required fields)

```json
{
  "packId": "foundation.core",
  "version": "1.0.0",
  "schemaVersion": "1",
  "kind": "foundation",
  "locale": "en-US",
  "publicationStatus": "published",
  "translationDependencies": ["web"],
  "contentOwner": "path-formation",
  "reviewStatus": "theologically_reviewed",
  "checksumSha256": "...",
  "minAppVersion": "2.0.0",
  "releaseNotes": "Initial foundation pack",
  "entries": [
    { "path": "foci.json", "type": "foci" },
    { "path": "assignments.json", "type": "assignments" },
    { "path": "prompts.json", "type": "prompts" },
    { "path": "scripture_references.json", "type": "scripture_references" },
    { "path": "scripture_texts.web.json", "type": "scripture_texts" },
    { "path": "teachings_jesus.json", "type": "teachings" },
    { "path": "workouts.json", "type": "workouts" },
    { "path": "coaching_fallback.json", "type": "coaching_messages" },
    { "path": "nutrition.json", "type": "nutrition" },
    { "path": "safety.json", "type": "safety" }
  ]
}
```

### 10.3 Atomic install algorithm

```text
1. Download bundle to temp storage
2. Verify checksumSha256
3. Validate JSON Schema + referential integrity
4. Validate translationDependencies are installed / permitted
5. Swap temp → active in a single IDB transaction
6. Record profile_content_installs (remote) when online
7. On any failure: abort; keep previous active pack; surface retry
```

**Never** activate a partially written pack.

### 10.4 Entity types inside packs

| Type | Purpose |
|---|---|
| `foci` | Formation focus definitions + week copy |
| `assignments` | Daily righteousness assignments |
| `prompts` | Morning/midday/evening prompts |
| `teachings` | Jesus-primary teaching units + supporting scripture refs |
| `scripture_references` | Canonical locators only |
| `scripture_texts` | Translation-specific bodies (license-gated) |
| `workouts` | Templates, sessions, exercises |
| `nutrition` | Guidance blurbs + target heuristics |
| `coaching_messages` | Deterministic fallback copy |
| `safety` | PAR-Q, crisis resources, medical deferral |

### 10.5 Resolution

```text
season foci + week stage + pressure tags + morning_mode + template calendar
        → ContentService.resolve()
        → daily_plans.content_snapshot (immutable for that day once morning starts)
```

Pack upgrades affect **future** materialization only (unless admin force-refresh and morning not started).

---

## 11. Scripture licensing boundary

### 11.1 Separation model

```text
scripture_references     → where it is in the canon (always)
translation_id           → which wording stream
scripture_texts          → licensed/permitted words (optional)
commentary / explanation → our content (pack)
coaching application     → our content or AI narration over refs (not fabricated verse text)
```

Every passage in the product carries `reference_id` independently of whether `text_body` is present.

### 11.2 Development default

Use a **public-domain or explicitly permitted** translation (e.g. World English Bible — confirm at implementation time) for foundation packs.

### 11.3 Before bundling any copyrighted text

Legal confirmation required for:

- Digital distribution  
- Storage in content packs  
- Offline access  
- Display inside AI-generated coaching experiences  
- Quotation volume required by product  
- Commercial use (if applicable)  

Until confirmed, do **not** bundle that translation.

### 11.4 Runtime rules

| Situation | Behavior |
|---|---|
| Approved text available | Show text + attribution |
| Reference only | Show canonical reference; optional “Open in external Bible” link |
| Coach needs wording but text unavailable | Provide **reference** + clearly labeled **paraphrase/summary** — never as quotation |
| AI output contains verse-like quotation not in supplied context | **Reject** via validator; regenerate or fallback |

### 11.5 Theological coaching lens

Authoritative coaching rules live in [`docs/COACH_CONSTITUTION.md`](./COACH_CONSTITUTION.md) (exported for runtime as `src/domain/coaching/constitution.ts`).

- **Primary lens:** teachings of Jesus  
- **Whole Scripture:** interpret, reinforce, apply those teachings faithfully  
- Content packs tag teaching units with `lens: jesus_primary` and supporting `reference_ids`

### 11.6 Translation providers later

```text
TranslationProvider.resolve(referenceId, preferredTranslationId)
  → { mode: 'full_text', text, attribution }
  | { mode: 'reference_only', reference }
  | { mode: 'external', url }
```

Adding a licensed translation = new translation pack + registry row — **no schema redesign**.

---

## 12. Today screen — wire-level IA

### 12.1 Job

Train today — body and character — with Coach leading.  
North Star: becoming, not completing.

### 12.2 Entry points

| Source | Target |
|---|---|
| Tab Today | Recommended next stage |
| Notif Morning / Midday / Evening / Workout | Matching session/block |
| Coach recommendation | Cited block |
| Busy-morning recommendation | Morning mode chooser |

### 12.3 Hierarchy

```text
Today
├── Context header
│     Date · Primary focus · Week N · Stage
│     Secondary (muted)
├── Coach strip (one proactive card)
├── Morning mode chooser (when relevant — see 12.4)
├── Session switcher: Morning | Midday? | Evening
└── Active session body (accordion sections)
```

### 12.4 Busy-day Morning (user-triggered)

**Never auto-replace Full Morning without consent.**

Visible options:

1. **Full Morning** — default  
2. **Short Morning**  
3. **Two-minute reset**  

App may **recommend** Short/Two-minute when:

- Opened late in the day  
- Stated busy schedule / low `time_budget.morning_min`  
- Repeated abandonment of Full Morning  
- User preference history  

Recommendation appears in Coach strip + mode chooser highlight. **User confirms.**

#### Formation loop preserved in all modes

| Mode | Teaching / Scripture | Intention | Body action | Prayer / reflection |
|---|---|---|---|---|
| Full | Full passage + explanation | Assignment + expected test | Prescribed workout/recovery | Full intention + prayer |
| Short | Short teaching or single focus verse | One practical intention | Abbreviated movement set or brisk walk option | Brief prayer |
| Two-minute | One sentence teaching + reference | One intention line | 10–20 breath + stand/walk cue | One-line prayer |

Short/Two-minute are **not** collapsed checklists; they still narrate becoming.

### 12.5 Morning sequence (Full)

```text
[A] Becoming
[B] Scripture / Jesus-primary teaching
[C] Assignment + expected test
[D] Train
[E] Fuel & recover (sleep, hydration, protein, movement)
[F] Intention & prayer → Complete Morning
```

### 12.6 Midday (&lt;2 min, optional)

Recall → emotion → tested? → adaptive coach line → tiny body pulse → Done.

### 12.7 Evening

Recap → Evidence → Heart (gratitude / optional confession) → Body review → optional Journal → Prayer → Complete.

### 12.8 Expand/collapse

One forced primary expanded section on session enter; user may expand more.  
Completed sections collapse to summaries with checkmarks.

### 12.9 Adaptive rules (selected)

- Medical clearance blocked → Train = walk/mobility only  
- Pain flag → recovery template + coach strip  
- Midday disabled → segment hidden  
- Season `grace` → soft reassessment card; training continues  
- Offline → bundled snapshot; Coach Ask limited (see §14)

### 12.10 Anti-patterns

No dashboard widgets, library browser, streak altar, or stats pile on Today.

---

## 13. Coach intent model and guardrails

### 13.1 Mode split

- **90% proactive structured** intents  
- **10% Ask Coach** (user-initiated), soft-capped  

### 13.2 Intent catalog

| Intent | Mode | Purpose |
|---|---|---|
| `daily_card` | structured | Lead the current moment |
| `recommend_morning_mode` | structured | Suggest Full/Short/Two-minute |
| `explain_season` | structured | Journey/Coach rationale |
| `apply_scripture` | structured | Application from supplied refs/texts only |
| `midday_adjust` | structured | Course correction |
| `evening_reflect` | structured | Evidence-oriented follow-up |
| `weekly_review` | structured | Themes + narrative |
| `workout_guide` | structured | Cues/subs within allow-list |
| `reset` | structured | After misses — next step |
| `season_propose` | structured | Explain recommender candidates |
| `ask_coach` | open (bounded) | User question with citations |

### 13.3 Soft daily cap (Ask Coach)

Approximate limit: **~10 user-initiated threads or substantial exchanges / day**.

**Not a hard stop.** As user approaches limit:

1. Encourage reflection and real-world application  
2. Suggest continuing an existing thread  
3. Point to today’s existing coaching content  
4. Allow limited grace for urgent/meaningful follow-ups  

Counters live in `coach_usage_daily`.  
**Never** expose token counts or cost language.

Structured intents do **not** consume the Ask Coach budget.

### 13.4 Prompt layers

1. **System constitution** — [`docs/COACH_CONSTITUTION.md`](./COACH_CONSTITUTION.md) / `COACH_CONSTITUTION`  
   (Scripture authority, Jesus-primary hierarchy, formation philosophy, response structure, humility, tone, anti-drift)  
2. Jesus-primary lens instruction + supplied teaching/ref context  
3. Content pack excerpts (assignments, allowed scripture texts)  
4. Structured user slice (memory boundaries)  
5. Intent JSON schema  

Product constraints that remain outside the constitution text (still enforced in validators/guards):

- No soul measurement / spiritual scoring  
- Anti-shame (constitution tone + §13.7)  
- Scripture quotation only from supplied approved texts (§13.5)  

Validate outputs; on failure → deterministic pack fallback.

### 13.5 Scripture guardrails for Coach

- Never fabricate verse wording  
- Quotations only from supplied approved `scripture_texts`  
- Otherwise: reference + labeled paraphrase  
- Reject model outputs that invent quotations  

### 13.6 Memory boundaries

Include: season foci, today assignment/expected test, 7-day evidence themes, stated prefs, safety constraints, pain flags.  
Exclude: eternal raw chat dumps, covert spiritual diagnosis, sensitive domains without consent, Mirror respondent identity.

Max active memory items; prefer season expiry; user can view/delete in Settings.

### 13.7 Safety

Crisis → help resources, stop generative coaching  
Medical → no diagnosis  
Workout → template rules + pain stop  
Shame → banned  
Soul verdicts → banned  

---

## 14. Offline and failure-state behavior

### 14.1 Offline capabilities

| Capability | Offline |
|---|---|
| View Today from cache / local materialize | yes |
| Full / Short / Two-minute Morning (foundation content) | yes |
| Midday / Evening check-ins | yes (queued) |
| Log workout / recovery | yes (queued) |
| Evidence / journal | yes (queued) |
| Journey / Growth cached reads | yes (stale OK, labeled) |
| Ask Coach | **degraded** — deterministic fallback only; queue “retry when online” optional |
| Structured coach cards from packs | yes |
| Remote pack update | no (keep last good) |
| Reassessment submit | queue until online |
| Push send | OS dependent; prefs still editable |

### 14.2 Failure states

| Failure | UX |
|---|---|
| API timeout on plan fetch | Use cache/local materialize; quiet banner “Working offline” |
| Sync push reject | Keep local; offer retry; do not shame |
| AI intent failure | Pack fallback copy |
| Ask Coach over soft cap | Guidance toward application + existing content; grace path |
| Pack download corrupt | Abort install; keep previous; retry |
| Scripture text unavailable | Reference + paraphrase label |
| Pain flag + attempted heavy progression | Block; offer recovery session |
| Crisis language detected | Resources; stop generative path |
| Empty cloud on first link | Preserve local (merge rules) |

### 14.3 Messaging tone

Failure copy is calm and practical. Never “you failed to sync your spirituality.”

---

## 15. Notifications

| Mode | Sends |
|---|---|
| Light | Morning |
| Standard | Morning + Evening |
| Active | Morning + Midday + Workout + Evening |

Copy requires personalization context when available (`focus`, `assignment`, `expected_test`, …).  
Generic “Time to check in.” is a bug if context existed.

Reassessment: soft at week 6; denser in grace; never lockout.

---

## 16. Safety and privacy

- RLS on profile-owned tables  
- Minimize AI payloads; sensitive domains opt-in (`consents.kind = sensitive_domains_ai`)  
- Export/delete  
- Exercise clearance before strength templates  
- Crisis resources in safety pack  
- Scripture license compliance before bundling copyrighted text  
- Growth Mirror anonymity constraints before that feature ships  

---

## 17. Migration from current app

| Donor | Fate |
|---|---|
| Focus profiles, questions, verses | Seed foundation content (respect licensing for verse bodies) |
| Prepare/Live/Reflect | Map → Morning/Midday/Evening |
| Push concepts | Refactor |
| AI narrates curated content | Keep |
| AppData blob / AppContext | Replace |
| Serving discovery / Archive museum / Go Deeper destination | Out of MVP |
| Brand “Path” | `src/brand` only |

---

## 18. Phase 0 scaffolding plan

**Goal:** Prove the architecture seams **without** building production feature UX (no real Today coaching UI, no assessment flow, no Coach chat UI).

### 18.1 In scope

1. **Brand module** — `src/brand` with working name; grep-guard that domain/api avoid hardcoding display name  
2. **Domain stubs** — types + pure functions for season FSM, morning modes, scripture reference helpers, coach intent enum, sync merge helpers (unit-testable)  
3. **StorageAdapter + IndexedDB impl** — stores listed in §7.4; smoke test read/write/outbox  
4. **Repository skeletons** — Profile, DailyPlan, ContentPack; methods throw `NotImplemented` except storage round-trip demos  
5. **TanStack Query provider** wired in app shell with a single health/ping query  
6. **Content foundation pack v0** — manifest + schemas + minimal JSON (1 focus, 1 teaching of Jesus, 1 assignment, 3 empty-but-valid workout template shells, fallback coach messages, WEB or chosen PD scripture sample for 1 reference)  
7. **Content loader** — load bundled pack, verify checksum, resolve one daily snapshot in a **dev harness page** or CLI script (not polished UI)  
8. **Scripture boundary types** — `reference` / `translationText` / `paraphrase` discriminated union enforced in domain  
9. **Supabase migration 0001** — core tables from §6 (can be applied in staging; app may not use all yet)  
10. **Docs** — this file remains SoT; short `content/README.md` for authors  
11. **CI** — pack JSON Schema validation script; TypeScript build green  

### 18.2 Explicitly out of scope (Phase 0)

- Production Today / Journey / Growth / Coach UI  
- Real onboarding assessment  
- OpenAI Coach calls in product flows  
- Push notification redesign  
- Growth Mirror  
- Remote pack CDN publishing pipeline (design stub OK)  
- Visual redesign  

### 18.3 Phase 0 acceptance criteria

- [x] Features cannot import IndexedDB APIs (eslint `no-restricted-globals` except adapter)  
- [x] StorageAdapter round-trip works (vitest + `/phase0` harness)  
- [x] Foundation pack validates and loads atomically  
- [x] Scripture sample resolves as `full_text` for WEB and `reference_only` when text stripped  
- [x] TanStack Query provider mounts (`AppProviders` + health query)  
- [ ] Migrations apply cleanly on empty Supabase project *(SQL authored; apply in staging when ready)*  
- [x] Product display name isolated in `src/brand` (legacy re-export kept during cutover)  
- [x] Unit tests for conflict merge helpers (pain flag OR, check-in response merge)  

**Harness:** open `/phase0` while `npm run dev` is running.  
**Check script:** `npm run phase0:check`

### 18.4 Suggested Phase 0 task order

```text
1. brand + domain types
2. StorageAdapter + IDB
3. content schemas + foundation pack v0
4. content loader + scripture resolver
5. supabase migration 0001
6. QueryClient shell
7. sync merge unit tests
8. eslint boundary for storage imports
```

---

## 19. Later phases

| Phase | Deliverable |
|---|---|
| 1 | Auth/profile, safety clearance, four-tab shell empty states |
| 2 | Onboarding assessment → season creation → plan materialization |
| 3 | Today Full/Short/Two-minute + Evening + optional Midday (both tracks) |
| 4 | Journey + Growth (limited metrics) |
| 5 | Coach structured intents + Ask Coach soft cap + notifications |
| 6 | Soft reassessment + recommender + weekly reviews |
| Later | Remote pack pipeline hardening, licensed translations, Growth Mirror, custom templates, wearables |

---

## 20. Architecture review checklist

Confirm the design clearly shows how decisions work together:

- [ ] IndexedDB only behind `StorageAdapter`  
- [ ] TanStack Query for server state; UI state separate  
- [ ] Postgres schema supports seasons, daily integrated plans, evidence, coach budget, scripture licensing  
- [ ] Sync rules prevent cloud wipe and preserve pain flags  
- [ ] Content packs hybrid, atomic, versioned  
- [ ] Scripture reference ≠ text; Coach paraphrase rules defined  
- [ ] Today IA includes user-triggered busy modes preserving formation loop  
- [ ] Coach 90/10 with soft Ask cap (no cost language)  
- [ ] Growth launches with limited non-appearance-dominant physical evidence  
- [ ] Offline Today works from foundation pack  
- [ ] Phase 0 scoped to seams, not feature product UI  
- [ ] North Star gate still kills streak/scoreboard features  

---

## Appendix A — Feature gate

Before any table, endpoint, or UI:

1. Does it help answer *Who are you becoming?*  
2. Is it input fetish (streaks, chapter counts) disguised as value?  
3. Can it ship as content data instead of code?  
4. Does Coach still lead?  
5. Is Journey still ≠ Growth?  
6. Soft reassessment / anti-shame preserved?  
7. Scripture licensing respected?  

---

## Appendix B — How the decisions interlock

```text
Bundled foundation pack
    → enables offline Today + first season
Remote atomic packs
    → expand without app release
StorageAdapter(IndexedDB)
    → drafts, outbox, installed packs
TanStack Query
    → remote seasons/plans/growth when online
Scripture references
    → stable keys across translation packs
Licensed texts optional
    → Coach falls back to reference + labeled paraphrase
Morning mode user choice
    → still materializes from same plan; snapshot records mode
Coach structured intents
    → use snapshot + memory; don’t burn Ask budget
Ask Coach soft cap
    → steers back to today’s plan/action
Growth limited metrics
    → evidence of becoming without appearance OS
Sync rules
    → keep local formation work safe across devices
```

---

*End of architecture draft. Awaiting approval before Phase 0 scaffolding or any production feature implementation.*
