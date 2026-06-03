# Deploying Path to Vercel

Path is a static Vite + React app. All data stays in each browser’s **localStorage** — profiles are per device, not synced across users or machines.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed locally
- A [GitHub](https://github.com/) account
- A [Vercel](https://vercel.com/) account (free tier is fine)

## 1. Verify the build locally

```bash
cd /path/to/1Tim4
npm install
npm run build
npm run preview
```

Open the preview URL (usually `http://localhost:4173`). Confirm:

- Profile selection asks for your name (no pre-seeded profiles)
- Each profile can complete the assessment independently
- Switching profiles preserves separate data

## 2. Create a GitHub repository

1. On GitHub, click **New repository**.
2. Name it (e.g. `path-app` or `1Tim4`).
3. Choose **Private** or **Public**.
4. Do **not** add a README, `.gitignore`, or license if you already have them locally.
5. Click **Create repository**.

## 3. Push your code

In the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Path app with multi-profile support"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your repository details.

If the repo already exists, use `git add`, `git commit`, and `git push` as usual.

## 4. Connect to Vercel

1. Log in at [vercel.com](https://vercel.com/).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repository.
4. Vercel should detect **Vite** automatically. Confirm:

   | Setting | Value |
   |---------|--------|
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

5. Click **Deploy**.

The included `vercel.json` rewrites all routes to `index.html` so client-side routing (`/assessment`, `/profiles`, etc.) works after refresh.

## 5. Share the deployment

After deploy, Vercel provides a URL like `https://your-project.vercel.app`.

**Testing with two profiles**

1. Open the URL in a browser (or two different browsers for side-by-side testing).
2. On first visit, enter a name and tap **Begin**.
3. Complete the spiritual assessment and accept a training plan for each person separately.
4. Use the profile name in the header (or **Guide → Switch profile**) to change profiles without losing data.

**Note:** Data is stored only in that browser’s localStorage. Clearing site data or using another device starts fresh unless you export data manually (not built in v1).

## 6. Optional: custom domain

In the Vercel project → **Settings** → **Domains**, add your domain and follow DNS instructions.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 404 on refresh for `/assessment` | Ensure `vercel.json` is committed and redeploy |
| Build fails on Vercel | Run `npm run build` locally and fix TypeScript errors |
| Blank page | Check the browser console; confirm `dist/index.html` exists after build |
| Old Michael/Bailey list | Deploy latest build; app auto-clears legacy seed profiles on first load |
| Profiles missing | Enter your name on the welcome screen; clear `path-profiles-registry` in devtools only if you need a full reset |

## Project files for deployment

- `vercel.json` — SPA fallback for React Router
- `package.json` — `build` script runs `tsc -b && vite build`
- `index.html` — Vite entry
- `public/` — static assets (illustrations, favicon)

### Optional: cloud sync (Apple / Google)

Set in Vercel (and `.env.local` for dev):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See [docs/CLOUD_SYNC.md](docs/CLOUD_SYNC.md) for Supabase setup (SQL migration, Apple, Google, redirect URLs).

Without these variables the app runs **local-only** (still fully usable).

### Optional: AI assessment guidance

Set `OPENAI_API_KEY` on Vercel (server-side only). See [docs/AI_ASSESSMENT.md](docs/AI_ASSESSMENT.md). Without it, intake uses the built-in rule-based planner.

### Optional: trail push reminders

See [docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md) for VAPID keys, Supabase `path_push_subscriptions`, and `CRON_SECRET`. Users configure times under **Guide → Trail reminders**.
