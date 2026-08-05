# Cross-device sermon sync — diagnostic & fix

## Diagnosis (root cause)

Sermon notes and generated weekly biblical plans were stored **only in device IndexedDB** (`formation_local_v1` keys `weeklyPlan:*`). Sign-in sync only covered the legacy trail blob in `path_profile_trails`. A Supabase `weekly_plans` table existed but was never wired from the client.

Therefore Device A and Device B could both be signed in as the same user and still show different sermon content.

## Storage map

| Data | Was | Now (after fix) |
|------|-----|-----------------|
| Sermon notes / title / AI week | IndexedDB only | Supabase `path_weekly_plans` + IndexedDB cache |
| Weekly plan payload | IndexedDB only | Same |
| Trail journal / assessments | `path_profile_trails` | Unchanged |
| Biblical day check-ins | localStorage | Still local-only (remaining risk) |
| Strength / walking / mobility | localStorage | Still local-only (remaining risk) |
| Day completion | localStorage | Still local-only (remaining risk) |

## Auth & ownership

- Cloud rows keyed by `auth.users.id` + local `profile_id` (text)
- RLS: `auth.uid() = user_id` on select/insert/update/delete
- Users cannot read another user’s rows

## Required migration

Run in Supabase SQL Editor:

`supabase/migrations/20260805120000_path_weekly_plans.sql`

Until this runs, the app still works locally and shows a sync warning after sign-in.

## Conflict strategy

1. Empty local draft never overwrites meaningful cloud content
2. Meaningful local + empty cloud → push local
3. Both meaningful → newer `updated_at` wins
4. Pending local edits are marked (“Unsynced sermon changes”) and flushed on reconnect / pagehide

## Manual verification

1. Apply migration
2. Device A: sign in → enter sermon → Build This Week’s Training
3. Device B: sign in same account → open Today / Sunday Sermon → content appears
4. Edit notes on B → refresh A → update appears
5. Offline edit on A → reconnect → pending clears and B sees update
6. Different account cannot see the rows (RLS)
