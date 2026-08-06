-- Fix API access for Path cloud sync tables.
-- RLS still limits each user to their own rows (auth.uid() = user_id).

grant select, insert, update, delete on table public.path_profile_trails to anon, authenticated;
grant all on table public.path_profile_trails to service_role;

grant select, insert, update, delete on table public.path_weekly_plans to anon, authenticated;
grant all on table public.path_weekly_plans to service_role;
