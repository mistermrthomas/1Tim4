# Trail push reminders

Path can nudge you for **Prepare** (morning), **Live** (midday), and **Reflect** (evening) at times you choose under **Guide → Trail reminders**.

## How it works

1. You enable reminders and pick which stages and times (15-minute steps).
2. The browser registers a **service worker** and a **Web Push** subscription.
3. A Vercel **cron job** runs every 15 minutes, finds subscriptions whose local time matches, and sends a push.
4. Tapping the notification opens the right trail screen (`/prepare`, `/live`, or `/reflect`).

Preferences are stored **on this device** and on the server (per browser subscription).

## One-time server setup

### 1. VAPID keys

```bash
npx web-push generate-vapid-keys
```

In **Vercel → Project → Settings → Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `VAPID_PUBLIC_KEY` | Public key from the command above |
| `VAPID_PRIVATE_KEY` | Private key (never expose to the client) |
| `VITE_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` (optional; API also serves the key) |
| `VAPID_SUBJECT` | `mailto:you@example.com` (optional) |

Redeploy after adding variables.

### 2. Supabase table

Run the SQL in [supabase/migrations/20260603000000_path_push_subscriptions.sql](../supabase/migrations/20260603000000_path_push_subscriptions.sql) in the Supabase SQL editor (same project as cloud sync).

Add to Vercel:

| Variable | Value |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings → API) |

The table has **no client RLS policies** — only the Vercel API uses the service role.

### 3. Cron secret

Vercel cron calls `/api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>`.

| Variable | Value |
|----------|--------|
| `CRON_SECRET` | Long random string (generate locally) |

`vercel.json` already defines a `*/15 * * * *` schedule. Hobby plans include cron; confirm under **Vercel → Project → Cron Jobs** after deploy.

## Local development

- `npm run dev` serves the UI only; push APIs need **`vercel dev`** or a deployed preview.
- Use **HTTPS** (or localhost) for notification permission and push subscription.

## Device notes

| Platform | Notes |
|----------|--------|
| **iPhone / iPad** | Add Path to the **Home Screen**, then enable reminders (iOS 16.4+). Safari in a tab alone does not receive push. |
| **Android / desktop** | Chrome, Edge, or Firefox; allow notifications when prompted. |
| **Blocked permission** | Re-enable in system Settings → Notifications for Path / the browser. |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “Server push is not configured” | Add VAPID keys and redeploy |
| “Push storage is not configured” | Run migration + `SUPABASE_SERVICE_ROLE_KEY` |
| No notification at the chosen time | Cron runs at :00, :15, :30, :45 — pick a time on those marks (e.g. 12:00, not 12:07) |
| Reminders worked once, then stopped | Re-toggle **Enable push reminders** in Guide |
