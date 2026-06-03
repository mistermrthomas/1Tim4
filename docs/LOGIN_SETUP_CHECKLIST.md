# Login setup checklist (do this now)

Work through these in order. The app is deployed at **https://1-tim4.vercel.app**; sign-in buttons stay disabled until steps 1–3 are done.

---

## 1. Supabase project (≈5 min)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (or use an existing one).
2. Note your **Project URL** and **anon public** key: **Project Settings → API**.
3. **SQL Editor** → paste and run everything in:
   `supabase/migrations/20260531000000_path_profile_trails.sql`

---

## 2. Auth URLs in Supabase (≈2 min)

**Authentication → URL Configuration**

| Field | Value |
|--------|--------|
| Site URL | `https://1-tim4.vercel.app` |
| Redirect URLs | `https://1-tim4.vercel.app/auth/callback` |
| | `http://localhost:5173/auth/callback` |

Save.

---

## 3. Vercel env vars + redeploy (≈3 min)

[Vercel](https://vercel.com) → **1Tim4** (or your project) → **Settings → Environment Variables**

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key from step 1 |

Apply to **Production** (and Preview if you use preview URLs).

**Deployments → Redeploy** latest `main` (env vars only apply after a new build).

Local dev (optional):

```bash
cp .env.example .env.local
# paste the same two values
npm run dev
```

---

## 4. Google sign-in first (≈15 min) — test before Apple

1. Supabase → **Authentication → Providers → Google** → Enable.
2. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
3. **APIs & Services → OAuth consent screen** — configure (External is fine for personal use).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
5. **Authorized redirect URIs** — copy the exact callback from Supabase’s Google provider page, e.g.  
   `https://YOUR_REF.supabase.co/auth/v1/callback`
6. Paste **Client ID** and **Client Secret** into Supabase → Save.

**Test:** After Vercel redeploy, open **Guide → Sync across devices → Sign in with Google**. You should land back on the app signed in.

---

## 5. Apple sign-in (when ready)

Requires [Apple Developer Program](https://developer.apple.com/programs/) membership.

1. **Identifiers → Services ID** — Sign in with Apple; domain `1-tim4.vercel.app`; return URL `https://YOUR_REF.supabase.co/auth/v1/callback`.
2. **Keys** — Sign in with Apple key (`.p8`), note Key ID and Team ID.
3. Supabase → **Authentication → Providers → Apple** — enable and fill Services ID, secret/key fields per Supabase docs.

**Test on iPhone:** Add to Home Screen → Guide → **Sign in with Apple**.

Full detail: [CLOUD_SYNC.md](./CLOUD_SYNC.md)

---

## 6. Verify in the app

1. Open https://1-tim4.vercel.app (hard refresh after deploy).
2. Enter your name on welcome if prompted.
3. **Guide** → **Sign in with Google** (or Apple).
4. Add a journal note → wait a few seconds → **Sync now** should succeed.
5. Second device/browser → same account → trail should appear after sign-in.

---

## Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| “Cloud sign-in is not enabled” | Vercel env vars missing or need redeploy |
| Redirect error | Add `/auth/callback` URL in Supabase redirect list |
| `relation path_profile_trails does not exist` | Run SQL migration (step 1) |
| Apple works on web but not PWA | Confirm Apple return URL matches Supabase callback exactly |
