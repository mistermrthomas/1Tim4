# Cloud sync with Supabase (Apple + Google)

Path saves **automatically on this device** and, when you sign in, **syncs to your Supabase account** so you can open the same trail on another iPhone, iPad, or browser.

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

## Step 1 — Create the database table

In Supabase → **SQL Editor**, run the migration file:

`supabase/migrations/20260531000000_path_profile_trails.sql`

This creates `path_profile_trails` with row-level security so each user only sees their own data.

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
| Sign in with Apple or Google | Cloud copy is **merged** with this device (newer wins per profile) |
| Journal, assessment, prayers | **Auto-upload** ~1.5s after each change |
| Sign out of cloud | Local data remains; cloud copy stays on server |
| Optional export file | Still available in Guide as extra safety |

Each **local profile name** syncs as a separate row keyed by profile id.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Buttons say “not enabled” | Env vars missing on Vercel; redeploy |
| Redirect loop / blank callback | Add exact `/auth/callback` URL in Supabase redirect list |
| Apple fails, Google works | Finish Apple Service ID domains + return URL |
| Data not on new phone | Sign in with **same** Apple/Google account; tap **Sync now** in Guide |
| RLS error | Re-run SQL migration; confirm policies exist |

---

## Privacy

- Trail JSON is stored in **your** Supabase project under **your** auth users.
- The anon key is public in the client (normal for Supabase); **RLS** prevents users reading each other’s rows.
- Do not put service role keys in the frontend.
