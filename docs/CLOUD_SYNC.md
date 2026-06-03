# Cloud sync & sign-in (optional)

Path **already saves automatically** on each phone or browser — every journal entry, assessment answer, and prayer is written to **local storage** as you go. You do not need to export a file for day-to-day use on the same device.

Export/import in **Guide** is only a safety net (new phone, cleared Safari data, or sharing a backup file).

## Why sign-in is different

**Cross-device sync** (iPhone + iPad, or replacing a lost phone) needs:

1. A **login** so the server knows whose data is whose  
2. A **cloud database** to store your trail  

That is not built into the static Vercel deploy alone — it requires a small backend.

## Recommended approach: Supabase

[Supabase](https://supabase.com) (free tier) provides:

| Feature | Providers |
|--------|-----------|
| Auth | Google, GitHub, Apple (via OAuth), email magic link |
| Database | Postgres row per profile with JSON trail data |
| Client | `@supabase/supabase-js` in the React app |

### High-level setup (when you are ready)

1. Create a Supabase project  
2. Enable Auth providers (Google + GitHub are easiest on web; Apple needs extra Apple Developer config)  
3. Create a `trails` table: `user_id`, `profile_id`, `data` (jsonb), `updated_at`  
4. Add to Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
5. App changes: sign-in screen → on save, debounced upsert to Supabase → on load, fetch latest  

**Login is required for sync** — without it, the app stays local-only (current behavior).

## Does it require Apple / Google / GitHub?

- **Same device only:** No login needed.  
- **Sync across devices or recover after data loss without a backup file:** Yes — pick one or more OAuth providers users already trust.

GitHub is convenient for you as the developer; Google and Apple are better for non-technical family members.

## Until cloud sync ships

- Use **Export backup** in Guide after completing the assessment  
- Store the `.json` file in iCloud Drive or email it to yourself  
- **Import backup** on a new device  

We can implement Supabase sync in a follow-up PR when you have a Supabase project ready.
