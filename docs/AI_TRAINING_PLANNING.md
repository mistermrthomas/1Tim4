# AI training planning (Stage 1)

Path turns a short **Sunday coaching questionnaire** into an editable weekly training plan using a **server-only** OpenAI call. Manual template assignment remains available as a fallback.

## Flow

1. Weekly goal  
2. Availability  
3. Review last week (manual + history prefill when available)  
4. Constraints  
5. Generate plan  
6. Review / edit (multi-workout days supported)  
7. Activate with the rest of the weekly plan  

Training is **not** an extension of the sermon. Prompts are configured separately in Settings.

## Enable

Same server key as biblical AI:

| Setup | Env var |
|-------|---------|
| Direct OpenAI | `OPENAI_API_KEY=sk-…` |
| Vercel AI Gateway | `OPENAI_API_KEY=vck-…` or `AI_GATEWAY_API_KEY` |

Endpoint: `POST /api/ai/training-plan`

## Settings

`/settings` → **AI training planning** — editable prompt + model (IndexedDB key `aiTraining:settings`).

Default prompt: `shared/defaultTrainingPrompt.ts`

## Data model notes

- `PhysicalWeeklyPlan.coachingIntake` — questionnaire answers  
- `PhysicalWeeklyPlan.aiProposal` — last validated AI plan  
- `ScheduledWorkoutBlock.exercises` — week-specific exercise list (does not rewrite permanent templates)  
- `TrainingWeekSummary` — Stage 1/2 prior-week summary (`src/domain/physical/trainingWeekSummary.ts`)  
- Session feedback fields on `WorkoutSession` for next-week coaching  

Suggested new catalog exercises return as `suggestedCatalogAdditions` and are **not** auto-created.
