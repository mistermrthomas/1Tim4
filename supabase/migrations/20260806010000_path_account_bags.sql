-- Account-scoped training bags (strength, physical logs, day completion, etc.).
-- One row per (user, bag). Not tied to local profile UUIDs — same account, same data.

create table if not exists public.path_account_bags (
  user_id uuid not null references auth.users (id) on delete cascade,
  bag_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  primary key (user_id, bag_key)
);

create index if not exists path_account_bags_user_updated_idx
  on public.path_account_bags (user_id, updated_at desc);

alter table public.path_account_bags enable row level security;

create policy "Users read own account bags"
  on public.path_account_bags for select
  using (auth.uid() = user_id);

create policy "Users insert own account bags"
  on public.path_account_bags for insert
  with check (auth.uid() = user_id);

create policy "Users update own account bags"
  on public.path_account_bags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own account bags"
  on public.path_account_bags for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.path_account_bags to anon, authenticated;
grant all on table public.path_account_bags to service_role;
