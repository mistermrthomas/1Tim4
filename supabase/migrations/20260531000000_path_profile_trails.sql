-- Path: per-user, per-local-profile trail storage (run in Supabase SQL Editor)

create table if not exists public.path_profile_trails (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null,
  profile_name text not null default 'Traveler',
  app_data jsonb not null,
  app_mode text not null default 'live' check (app_mode in ('new', 'demo', 'live')),
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create index if not exists path_profile_trails_user_updated_idx
  on public.path_profile_trails (user_id, updated_at desc);

alter table public.path_profile_trails enable row level security;

create policy "Users read own trails"
  on public.path_profile_trails for select
  using (auth.uid() = user_id);

create policy "Users insert own trails"
  on public.path_profile_trails for insert
  with check (auth.uid() = user_id);

create policy "Users update own trails"
  on public.path_profile_trails for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own trails"
  on public.path_profile_trails for delete
  using (auth.uid() = user_id);
