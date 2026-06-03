# AI study features (optional)

Uses the same `OPENAI_API_KEY` on Vercel for both features below.

---

## Go deeper (passage study)

On **training verse**, **Prepare standout verse**, **Live**, and **assessment results**, tap **Go deeper** for:

- Historical **setting** and passage **background**
- **Key words** (Greek/Hebrew when relevant)
- Related passages and a **reflection** question
- Links to **Blue Letter Bible** and **Bible Gateway (NASB)**

Uses `POST /api/go-deeper`. Disable with `VITE_GO_DEEPER_AI=false` (links still work).

---

## Chapter questions (Prepare)

After quick-start reading, **Prepare** can request questions for the chapter you read via `POST /api/reading-questions` (same `OPENAI_API_KEY`). Disable with `VITE_READING_QUESTIONS_AI=false` — generic morning questions remain.

---

## Assessment guidance

After the spiritual intake, Path can call a **server-side** OpenAI model to choose a training focus and write personalized **whyFocus** text. Scripture, reading plan, and daily emphasis still come from curated profiles in the app — the model does not invent verses.

If AI is unavailable, the existing **rule-based** planner runs automatically (same as before).

---

## Enable on Vercel

1. [Vercel](https://vercel.com) → your project → **Settings → Environment Variables**
2. Add:

| Variable | Required | Example |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | `sk-…` from [OpenAI](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` (default) |

3. **Redeploy** production.

No API key is stored in the frontend. The browser only calls `/api/assessment-plan` on your domain.

---

## Disable AI (rules only)

Set on Vercel (or `.env.local`):

```bash
VITE_ASSESSMENT_AI=false
```

Redeploy. Intake still works; only the rule-based engine runs.

---

## Local development

- `npm run dev` — assessment uses **rules only** (no API route unless you use `vercel dev`).
- `npx vercel dev` — runs the Vite app and `/api/assessment-plan` together with env vars from `.env.local`.

---

## Privacy

- Only **assessment answers** are sent to OpenAI (not your full journal).
- Answers are truncated server-side before the request.
- Do not log `OPENAI_API_KEY` or commit it to git.

---

## Cost (rough)

One completion per finished intake (~2–4k tokens with `gpt-4o-mini`) is typically **well under a cent**. 100 completions/month is usually a few dollars at most.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No “shaped from your intake” note on results | `OPENAI_API_KEY` missing or redeploy needed |
| Spinner then rule-based plan | API error — check Vercel **Functions** logs for `assessment-plan` |
| Works on prod, not locally | Use `vercel dev` or accept rules-only in `npm run dev` |
