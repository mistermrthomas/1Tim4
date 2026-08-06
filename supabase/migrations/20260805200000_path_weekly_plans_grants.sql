-- Allow signed-in users to use path_weekly_plans through the Supabase API.
-- RLS still restricts rows to auth.uid() = user_id.

grant select, insert, update, delete on table public.path_weekly_plans to authenticated;
grant all on table public.path_weekly_plans to service_role;
