-- Formation schema fixes + Row Level Security
-- Apply after 20260725000000_formation_core_v1.sql
-- Assumes Supabase auth.uid(); staging harness stubs auth when needed.
-- Production / populated environments: review before apply. Safe for empty staging.

-- ---------------------------------------------------------------------------
-- 1) NULL-safe assessment domain scores uniqueness
-- ---------------------------------------------------------------------------
alter table assessment_domain_scores
  alter column focus_key set default '';

update assessment_domain_scores set focus_key = '' where focus_key is null;

alter table assessment_domain_scores
  alter column focus_key set not null;

alter table assessment_domain_scores
  drop constraint if exists assessment_domain_scores_assessment_id_domain_focus_key_key;

alter table assessment_domain_scores
  add constraint assessment_domain_scores_assessment_id_domain_focus_key_key
  unique (assessment_id, domain, focus_key);

-- ---------------------------------------------------------------------------
-- 2) Secondary indexes for common query paths
-- ---------------------------------------------------------------------------
create index if not exists seasons_profile_id_status_idx
  on seasons (profile_id, status);

create index if not exists daily_plans_season_id_idx
  on daily_plans (season_id);

create index if not exists check_ins_daily_plan_id_idx
  on check_ins (daily_plan_id);

create index if not exists evidence_notes_profile_id_created_at_idx
  on evidence_notes (profile_id, created_at desc);

create index if not exists journal_entries_profile_id_created_at_idx
  on journal_entries (profile_id, created_at desc);

create index if not exists workout_logs_profile_id_idx
  on workout_logs (profile_id);

create index if not exists coach_threads_profile_id_idx
  on coach_threads (profile_id);

create index if not exists coach_recommendations_profile_status_idx
  on coach_recommendations (profile_id, status);

create index if not exists assessments_profile_id_kind_idx
  on assessments (profile_id, kind);

-- ---------------------------------------------------------------------------
-- 3) Ownership helper
-- ---------------------------------------------------------------------------
create or replace function public.is_profile_owner(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_profile_id
      and auth_user_id is not null
      and auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_profile_owner(uuid) from public;
do $$
begin
  grant execute on function public.is_profile_owner(uuid) to anon;
exception when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.is_profile_owner(uuid) to authenticated;
exception when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.is_profile_owner(uuid) to service_role;
exception when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Enable RLS + policies (profile-owned data)
-- ---------------------------------------------------------------------------

-- profiles
alter table profiles enable row level security;
drop policy if exists profiles_select_own on profiles;
drop policy if exists profiles_insert_own on profiles;
drop policy if exists profiles_update_own on profiles;
drop policy if exists profiles_delete_own on profiles;
create policy profiles_select_own on profiles
  for select using (auth.uid() = auth_user_id);
create policy profiles_insert_own on profiles
  for insert with check (auth.uid() = auth_user_id);
create policy profiles_update_own on profiles
  for update using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);
create policy profiles_delete_own on profiles
  for delete using (auth.uid() = auth_user_id);

-- Direct profile_id tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'consents',
    'safety_clearances',
    'assessments',
    'seasons',
    'season_recommendations',
    'milestones',
    'daily_plans',
    'journal_entries',
    'evidence_notes',
    'weekly_reviews',
    'workout_logs',
    'body_metrics',
    'growth_snapshots',
    'coach_memory_items',
    'coach_threads',
    'coach_recommendations',
    'coach_usage_daily',
    'notification_prefs',
    'profile_content_installs',
    'sync_cursors',
    'sync_tombstones'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select_own', t);
    execute format('drop policy if exists %I on %I', t || '_insert_own', t);
    execute format('drop policy if exists %I on %I', t || '_update_own', t);
    execute format('drop policy if exists %I on %I', t || '_delete_own', t);
    execute format(
      'create policy %I on %I for select using (public.is_profile_owner(profile_id))',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (public.is_profile_owner(profile_id))',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on %I for update using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id))',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on %I for delete using (public.is_profile_owner(profile_id))',
      t || '_delete_own', t
    );
  end loop;
end $$;

-- Nested via assessments
alter table assessment_domain_scores enable row level security;
drop policy if exists assessment_domain_scores_select_own on assessment_domain_scores;
drop policy if exists assessment_domain_scores_insert_own on assessment_domain_scores;
drop policy if exists assessment_domain_scores_update_own on assessment_domain_scores;
drop policy if exists assessment_domain_scores_delete_own on assessment_domain_scores;
create policy assessment_domain_scores_select_own on assessment_domain_scores
  for select using (
    exists (
      select 1 from assessments a
      where a.id = assessment_id and public.is_profile_owner(a.profile_id)
    )
  );
create policy assessment_domain_scores_insert_own on assessment_domain_scores
  for insert with check (
    exists (
      select 1 from assessments a
      where a.id = assessment_id and public.is_profile_owner(a.profile_id)
    )
  );
create policy assessment_domain_scores_update_own on assessment_domain_scores
  for update using (
    exists (
      select 1 from assessments a
      where a.id = assessment_id and public.is_profile_owner(a.profile_id)
    )
  )
  with check (
    exists (
      select 1 from assessments a
      where a.id = assessment_id and public.is_profile_owner(a.profile_id)
    )
  );
create policy assessment_domain_scores_delete_own on assessment_domain_scores
  for delete using (
    exists (
      select 1 from assessments a
      where a.id = assessment_id and public.is_profile_owner(a.profile_id)
    )
  );

-- Nested via seasons
do $$
declare
  t text;
begin
  foreach t in array array['season_foci', 'season_weeks']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select_own', t);
    execute format('drop policy if exists %I on %I', t || '_insert_own', t);
    execute format('drop policy if exists %I on %I', t || '_update_own', t);
    execute format('drop policy if exists %I on %I', t || '_delete_own', t);
    execute format(
      'create policy %I on %I for select using (
        exists (select 1 from seasons s where s.id = season_id and public.is_profile_owner(s.profile_id))
      )', t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (
        exists (select 1 from seasons s where s.id = season_id and public.is_profile_owner(s.profile_id))
      )', t || '_insert_own', t
    );
    execute format(
      'create policy %I on %I for update using (
        exists (select 1 from seasons s where s.id = season_id and public.is_profile_owner(s.profile_id))
      ) with check (
        exists (select 1 from seasons s where s.id = season_id and public.is_profile_owner(s.profile_id))
      )', t || '_update_own', t
    );
    execute format(
      'create policy %I on %I for delete using (
        exists (select 1 from seasons s where s.id = season_id and public.is_profile_owner(s.profile_id))
      )', t || '_delete_own', t
    );
  end loop;
end $$;

-- Nested via daily_plans
do $$
declare
  t text;
begin
  foreach t in array array[
    'practice_assignments',
    'check_ins',
    'recovery_targets',
    'recovery_logs'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select_own', t);
    execute format('drop policy if exists %I on %I', t || '_insert_own', t);
    execute format('drop policy if exists %I on %I', t || '_update_own', t);
    execute format('drop policy if exists %I on %I', t || '_delete_own', t);
    execute format(
      'create policy %I on %I for select using (
        exists (select 1 from daily_plans d where d.id = daily_plan_id and public.is_profile_owner(d.profile_id))
      )', t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (
        exists (select 1 from daily_plans d where d.id = daily_plan_id and public.is_profile_owner(d.profile_id))
      )', t || '_insert_own', t
    );
    execute format(
      'create policy %I on %I for update using (
        exists (select 1 from daily_plans d where d.id = daily_plan_id and public.is_profile_owner(d.profile_id))
      ) with check (
        exists (select 1 from daily_plans d where d.id = daily_plan_id and public.is_profile_owner(d.profile_id))
      )', t || '_update_own', t
    );
    execute format(
      'create policy %I on %I for delete using (
        exists (select 1 from daily_plans d where d.id = daily_plan_id and public.is_profile_owner(d.profile_id))
      )', t || '_delete_own', t
    );
  end loop;
end $$;

-- Nested via coach_threads
alter table coach_messages enable row level security;
drop policy if exists coach_messages_select_own on coach_messages;
drop policy if exists coach_messages_insert_own on coach_messages;
drop policy if exists coach_messages_update_own on coach_messages;
drop policy if exists coach_messages_delete_own on coach_messages;
create policy coach_messages_select_own on coach_messages
  for select using (
    exists (
      select 1 from coach_threads t
      where t.id = thread_id and public.is_profile_owner(t.profile_id)
    )
  );
create policy coach_messages_insert_own on coach_messages
  for insert with check (
    exists (
      select 1 from coach_threads t
      where t.id = thread_id and public.is_profile_owner(t.profile_id)
    )
  );
create policy coach_messages_update_own on coach_messages
  for update using (
    exists (
      select 1 from coach_threads t
      where t.id = thread_id and public.is_profile_owner(t.profile_id)
    )
  )
  with check (
    exists (
      select 1 from coach_threads t
      where t.id = thread_id and public.is_profile_owner(t.profile_id)
    )
  );
create policy coach_messages_delete_own on coach_messages
  for delete using (
    exists (
      select 1 from coach_threads t
      where t.id = thread_id and public.is_profile_owner(t.profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Catalog / scripture tables — published read for everyone; writes via service role
-- ---------------------------------------------------------------------------
alter table content_packs enable row level security;
drop policy if exists content_packs_select_published on content_packs;
create policy content_packs_select_published on content_packs
  for select using (publication_status = 'published');

alter table scripture_translations enable row level security;
drop policy if exists scripture_translations_select_all on scripture_translations;
create policy scripture_translations_select_all on scripture_translations
  for select using (true);

alter table scripture_references enable row level security;
drop policy if exists scripture_references_select_all on scripture_references;
create policy scripture_references_select_all on scripture_references
  for select using (true);

alter table scripture_texts enable row level security;
drop policy if exists scripture_texts_select_all on scripture_texts;
create policy scripture_texts_select_all on scripture_texts
  for select using (true);

-- Note: INSERT/UPDATE/DELETE on catalog tables intentionally have no policies for
-- anon/authenticated — service_role bypasses RLS for content publishing.
