-- Weekly planning workspace (Sunday–Saturday).
-- Client currently persists to IndexedDB; this table is the future cloud SoT.

create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  week_start_date date not null,
  week_end_date date not null,
  status text not null check (status in ('draft','active','completed','archived')),
  payload jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  unique (profile_id, week_start_date)
);

create index if not exists weekly_plans_profile_status_idx
  on weekly_plans (profile_id, status);

create index if not exists weekly_plans_week_start_idx
  on weekly_plans (week_start_date);
