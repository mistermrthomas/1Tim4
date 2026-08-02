# Church Notes AI

Turn rough sermon notes into a reviewed sermon summary and a seven-day formation layer — without replacing Bible reading, prayer, or church.

## Flow

1. **Capture** raw notes at `/church-notes` (autosave; originals never altered by AI)
2. **Analyze** via `POST /api/church-notes/analyze` (OpenAI Responses API, server-side only)
3. **Review** every generated section; flag uncertain Scripture / clarifications
4. **Approve** to create a `WeeklyFormationPlan` (Monday after the sermon by default)

Today shows the active theme and one before/after reading prompt. It does **not** replace an existing reading plan.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes (for AI) | Server-only. Never use `VITE_` / `NEXT_PUBLIC_` |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | For auth | JWT verification on the analyze route |
| `CHURCH_NOTES_REQUIRE_AUTH` | No | Force auth even without Supabase env |
| `VITE_CHURCH_NOTES_AI` | No | Set `false` to disable the client call |

Local API: use `npx vercel dev` with `.env.local` so `/api/church-notes/analyze` runs.

## Security

- Auth: optional by default (rate-limited anonymous allowed for local-first capture). Set `CHURCH_NOTES_REQUIRE_AUTH=true` to require a Supabase JWT. Invalid tokens are always rejected.
- Rate limit: 8 requests / minute / user+IP (best-effort per instance)
- Idempotency: optional `requestId` blocks duplicate in-flight submits
- Logs: note length + outcome only — never full sermon notes or the API key

## Fixture

Open `/church-notes?fixture=1` to load the First Look Sunday sample notes (Romans 12 / James 1 / 2 Timothy 4).

## Database

Apply `supabase/migrations/20260802160000_church_notes_v1.sql` when enabling cloud sync for church notes. Until then, data lives in IndexedDB (`entities` store).
