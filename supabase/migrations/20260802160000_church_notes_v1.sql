-- Church Notes AI: sermon notes, analyses, and weekly formation plans.
-- Client currently persists to IndexedDB; this table set is the future cloud SoT.

create table if not exists sermon_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sermon_date date not null,
  church text not null default '',
  speaker text not null default '',
  title text not null default '',
  series text not null default '',
  primary_scripture text not null default '',
  raw_notes text not null default '',
  source_links text not null default '',
  announcements_notes text not null default '',
  status text not null check (status in ('draft', 'analyzed', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sermon_notes_user_date_idx
  on sermon_notes (user_id, sermon_date desc);

create table if not exists sermon_analyses (
  id uuid primary key default gen_random_uuid(),
  sermon_note_id uuid not null references sermon_notes(id) on delete cascade,
  model text not null,
  prompt_version text not null,
  structured_analysis jsonb not null,
  user_edited_analysis jsonb not null,
  generated_at timestamptz not null default now(),
  approved_at timestamptz
);

create unique index if not exists sermon_analyses_note_uidx
  on sermon_analyses (sermon_note_id);

create table if not exists weekly_formation_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sermon_note_id uuid not null references sermon_notes(id) on delete cascade,
  analysis_id uuid references sermon_analyses(id) on delete set null,
  start_date date not null,
  end_date date not null,
  weekly_theme text not null default '',
  memory_verse text not null default '',
  central_question text not null default '',
  daily_plan jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_formation_plans_user_active_idx
  on weekly_formation_plans (user_id, active);

create index if not exists weekly_formation_plans_dates_idx
  on weekly_formation_plans (start_date, end_date);

alter table sermon_notes enable row level security;
alter table sermon_analyses enable row level security;
alter table weekly_formation_plans enable row level security;

create policy sermon_notes_owner_all on sermon_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sermon_analyses_owner_all on sermon_analyses
  for all using (
    exists (
      select 1 from sermon_notes sn
      where sn.id = sermon_note_id and sn.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sermon_notes sn
      where sn.id = sermon_note_id and sn.user_id = auth.uid()
    )
  );

create policy weekly_formation_plans_owner_all on weekly_formation_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
