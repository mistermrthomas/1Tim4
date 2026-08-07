-- Per-auth-user formation local state (weekly plans, church notes).
-- Complements path_profile_trails (legacy journal) so phones restore Today/Church Notes.

create table if not exists public.path_user_formation_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.path_user_formation_state enable row level security;

create policy "Users read own formation state"
  on public.path_user_formation_state for select
  using (auth.uid() = user_id);

create policy "Users insert own formation state"
  on public.path_user_formation_state for insert
  with check (auth.uid() = user_id);

create policy "Users update own formation state"
  on public.path_user_formation_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own formation state"
  on public.path_user_formation_state for delete
  using (auth.uid() = user_id);
