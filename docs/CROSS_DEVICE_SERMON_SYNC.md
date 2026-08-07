# Cross-device account data (no Sync button)

## Product model

When you are signed in, **the account is the source of truth**. Local storage is a cache. Open any device on the same Apple/Google account and you should see the same sermons, workouts, and daily training. There is no Sync now step.

Automatic behavior:
- Save on a device → upload to your account
- Open / focus a device → pull latest from your account
- Offline edits → upload when back online

## Storage map

| Data | Cloud table |
|------|-------------|
| Sermon notes / weekly biblical plan | `path_weekly_plans` |
| Trail journal / assessments | `path_profile_trails` |
| Strength log, rotation, physical tracker/plan | `path_account_bags` |
| Walking / mobility / body / travel | `path_account_bags` |
| Biblical day check-ins, day completion | `path_account_bags` |
| Work training, rhythm, plan config | `path_account_bags` |

## Required migrations

Run in Supabase SQL Editor (in order if not already applied):

1. `supabase/migrations/20260531000000_path_profile_trails.sql`
2. `supabase/migrations/20260805120000_path_weekly_plans.sql` (+ grants migrations if needed)
3. `supabase/migrations/20260806010000_path_account_bags.sql` — **required for workouts / strength / day logs**

## Auth & ownership

- Weekly plans: keyed by `user_id` (+ `profile_id` for history); pull merges **all** profile rows (newest per week)
- Account bags: keyed by `user_id` + `bag_key` only (not local profile UUIDs)
- RLS: `auth.uid() = user_id`

## Conflict strategy

1. Empty local never overwrites meaningful cloud
2. Meaningful local + empty cloud → upload local
3. Both meaningful → newer revision wins
4. First upgrade with existing local data keeps local once, then uploads

## Manual verification

1. Apply `path_account_bags` migration
2. Device A (signed in): log a strength set + build sermon week
3. Device B (same account): open the app → Today / Strength show the same data
4. Edit on B → reopen A → update appears
5. No Sync button required
