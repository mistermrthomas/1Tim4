# Cloud sync with Supabase (Apple + Google)

**New to setup?** Use the ordered checklist: [LOGIN_SETUP_CHECKLIST.md](./LOGIN_SETUP_CHECKLIST.md).

Path saves **automatically on this device** and, when you sign in, **keeps your account as the source of truth** so every phone and computer signed into the same Apple/Google account sees the same sermons, workouts, and daily training. There is no Sync button.

## What you need

1. A [Supabase](https://supabase.com) project (free tier is fine)
2. **Apple** and/or **Google** auth enabled in Supabase
3. Environment variables on **Vercel** and locally (`.env.local`)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

Find URL and anon key in Supabase → **Project Settings → API**.

---

## Step 1 — Create the database tables

In Supabase → **SQL Editor**, run these migration files (in order):

1. `supabase/migrations/20260531000000_path_profile_trails.sql` — trail / journal
2. `supabase/migrations/20260805120000_path_weekly_plans.sql` — sermon notes + weekly biblical plans
3. `supabase/migrations/20260806010000_path_account_bags.sql` — **strength, workouts, walking, day logs, etc.**

All use row-level security so each user only sees their own data.

**Required for workouts across devices:** run `path_account_bags` or Device B will not receive strength logs / physical training.

---

## Step 2 — Auth redirect URLs

Supabase → **Authentication → URL Configuration**

**Site URL** (production):

`https://1-tim4.vercel.app`

**Redirect URLs** (add all):

- `https://1-tim4.vercel.app/auth/callback`
- `http://localhost:5173/auth/callback`
- `http://localhost:4173/auth/callback` (preview)

---

## Step 3 — Google sign-in (recommended to set up first)

Supabase → **Authentication → Providers → Google**

1. Enable Google
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID → **Web application**
3. Authorized redirect URI (Supabase shows you the exact URL), typically:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Paste Client ID and Client Secret into Supabase

Test Google on desktop before Apple — it is simpler to verify end-to-end.

---

## Step 4 — Sign in with Apple (for iPhone / Apple ecosystem)

Apple requires a paid [Apple Developer](https://developer.apple.com/) account.

### A. App ID & Service ID

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. **Identifiers → +** → **App IDs** → enable **Sign in with Apple**
3. **Identifiers → +** → **Services IDs** → enable **Sign in with Apple**
   - Configure **Domains**: `1-tim4.vercel.app` (and `localhost` for dev if needed)
   - **Return URLs**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### B. Key for Supabase

1. **Keys → +** → Sign in with Apple → download `.p8` key
2. Note **Key ID** and **Team ID** (Membership details)

### C. Supabase Apple provider

Supabase → **Authentication → Providers → Apple**

- Enable Apple
- Services ID (from step A)
- Secret Key: contents of `.p8` file (or use Supabase helper to generate JWT)
- Key ID, Team ID
- Bundle ID / Service ID as Supabase docs specify

Apple’s web flow opens in Safari; on iPhone home-screen PWA it should still work when OAuth redirects back to `/auth/callback`.

---

## Step 5 — Deploy env vars to Vercel

Vercel → your project → **Settings → Environment Variables**

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Production** (and Preview if you use preview URLs).

Redeploy after saving.

Local dev:

```bash
cp .env.example .env.local
# fill in values
npm run dev
```

---

## How sync behaves

| Action | Behavior |
|--------|----------|
| Use app without signing in | Data stays **local only** (same as before) |
| Sign in with Apple or Google | Cloud copy is **merged** with this device |
| Journal, assessment, prayers | Auto-upload after each change (`path_profile_trails`) |
| Sermon notes + weekly biblical plan | Auto-upload after meaningful saves (`path_weekly_plans`) |
| Empty local draft vs cloud content | Cloud wins (empty drafts never overwrite server content) |
| Both sides have content | Newer `updated_at` wins; pending local edits are kept briefly |
| Offline edits | Marked pending (“Unsynced sermon changes”); flush on reconnect |
| Sign out of cloud | Local cache remains; cloud copy stays on server |

Each **local profile name** syncs as a separate row keyed by `(user_id, profile_id)`.

IndexedDB / localStorage are an **offline cache**, not a second permanent account.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Buttons say “not enabled” | Env vars missing on Vercel; redeploy |
| Redirect loop / blank callback | Add exact `/auth/callback` URL in Supabase redirect list |
| Apple fails, Google works | Finish Apple Service ID domains + return URL |
| Data not on new phone | Sign in with **same** Apple/Google account; reopen the app (account loads automatically). Confirm `path_account_bags` + weekly plan migrations ran. |
| Sermon missing on Device B | Confirm `path_weekly_plans` migration ran; sign in same account; open Today again after sync |
| RLS error | Re-run SQL migration; confirm policies exist |

---

## Privacy

- Trail JSON is stored in **your** Supabase project under **your** auth users.
- The anon key is public in the client (normal for Supabase); **RLS** prevents users reading each other’s rows.
- Do not put service role keys in the frontend.
