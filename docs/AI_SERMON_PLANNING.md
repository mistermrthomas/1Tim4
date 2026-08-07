# AI sermon-to-week planning

Path turns **Sunday sermon notes** into an editable Monday–Friday Biblical plan via a **server-only** OpenAI call. Manual planning still works without a key.

## Enable

Path accepts either:

| Setup | Env var | Notes |
|-------|---------|--------|
| Direct OpenAI | `OPENAI_API_KEY=sk-…` | Calls `api.openai.com` |
| Vercel AI Gateway | `OPENAI_API_KEY=vck-…` **or** `AI_GATEWAY_API_KEY=vck-…` | Calls `https://ai-gateway.vercel.sh/v1` automatically when the key starts with `vck_` |

1. Set the key in `.env.local` (local) and Vercel → **Settings → Environment Variables** (production).
2. Optional: `OPENAI_MODEL` — `gpt-4o-mini` (default), `gpt-4o`, `gpt-4.1-mini`, or `gpt-4.1`. Through the gateway these become `openai/gpt-4o-mini`, etc.
3. Optional override: `OPENAI_BASE_URL` if you need a custom OpenAI-compatible endpoint.
4. Redeploy after changing env vars on Vercel.
5. Local API routes: use `npx vercel dev` (plain `npm run dev` does not serve `/api`).

**Important:** A key that is “Active” in the Vercel AI Gateway UI only works if Path routes through the gateway. A `vck_…` key will fail if sent to OpenAI’s direct API. This app auto-detects `vck_` keys.

Never put the key in client code, IndexedDB, Settings UI, or a `VITE_` variable.

## Endpoints

| Route | Purpose |
|-------|---------|
| `POST /api/ai/sermon-plan` | Generate / regenerate structured Biblical week |
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
