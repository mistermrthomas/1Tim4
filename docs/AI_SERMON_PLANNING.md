# AI sermon-to-week planning

Path turns **Sunday sermon notes** into an editable Monday–Friday biblical plan via a **server-only** OpenAI call. Manual planning still works without a key.

## Enable

1. Set `OPENAI_API_KEY` in `.env.local` (local) and Vercel → **Settings → Environment Variables** (production).
2. Optional: `OPENAI_MODEL` — must be one of `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1` (default `gpt-4o-mini`).
3. Redeploy after adding env vars on Vercel.
4. Local API routes: use `npx vercel dev` (plain `npm run dev` does not serve `/api`).

Never put the key in client code, IndexedDB, Settings UI, or a `VITE_` variable.

## Endpoints

| Route | Purpose |
|-------|---------|
| `POST /api/ai/sermon-plan` | Generate / regenerate structured biblical week |
| `POST /api/ai/connection-test` | Minimal connection probe from Settings |

## Product flow

1. `/plan/week` — enter sermon notes (+ optional personal context).
2. **Generate This Week’s Biblical Plan** (disabled until notes are meaningful).
3. Edit the faith track; optionally regenerate with “What should change?”
4. Activate only after review — AI never auto-activates.
5. `/today` shows today’s weekday assignment only.

## Settings

`/settings` → **AI planning**: editable prompt (IndexedDB), model allowlist, Reset to Default, Test AI Connection.

Default prompt lives in `shared/defaultPlanningPrompt.ts` only.
