-- Path: per-user, per-local-profile weekly plan / sermon storage.
-- IndexedDB remains an offline cache; this table is the authoritative cloud SoT.

create table if not exists public.path_weekly_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null,
  week_start_date date not null,
  week_end_date date not null,
  plan_id text not null,
  status text not null check (status in ('draft', 'active', 'completed', 'archived')),
  payload jsonb not null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  primary key (user_id, profile_id, week_start_date)
);

create index if not exists path_weekly_plans_user_updated_idx
  on public.path_weekly_plans (user_id, updated_at desc);

create index if not exists path_weekly_plans_user_status_idx
  on public.path_weekly_plans (user_id, profile_id, status);

alter table public.path_weekly_plans enable row level security;

create policy "Users read own weekly plans"
  on public.path_weekly_plans for select
  using (auth.uid() = user_id);

create policy "Users insert own weekly plans"
  on public.path_weekly_plans for insert
  with check (auth.uid() = user_id);

create policy "Users update own weekly plans"
  on public.path_weekly_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own weekly plans"
  on public.path_weekly_plans for delete
  using (auth.uid() = user_id);
