-- Path: Web Push subscriptions for trail reminders (server-only via service role)

create table if not exists public.path_push_subscriptions (
  endpoint text primary key,
  profile_id text not null,
  profile_name text not null default 'Traveler',
  p256dh text not null,
  auth_key text not null,
  timezone text not null,
  reminders jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists path_push_subscriptions_profile_idx
  on public.path_push_subscriptions (profile_id);

alter table public.path_push_subscriptions enable row level security;

-- No client policies: Vercel API uses the service role key only.
