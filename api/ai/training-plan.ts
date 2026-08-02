import { isAllowedTrainingPlanModel } from '../../shared/aiModels.js';
import { safeParseTrainingPlan, type TrainingPlan } from '../../shared/trainingPlanSchema.js';
import { createTrainingPlanGenerator } from '../_lib/trainingPlanGenerator.js';

const MAX_PROMPT = 12_000;
const MAX_BODY_BYTES = 200_000;
const REQUEST_TIMEOUT_MS = 55_000;

interface RequestBody {
  weekStartDate?: string;
  intake?: unknown;
  planningPrompt?: string;
  model?: string;
  catalogContext?: unknown;
  adjustmentInstruction?: string;
  currentPlan?: unknown;
}

type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function truncate(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const generator = createTrainingPlanGenerator();
  if (!generator) {
    res.status(503).json({
      error:
        'AI training planning has not been configured. Add OPENAI_API_KEY to the server environment. You can still build the week manually.',
      code: 'MISSING_CONFIGURATION',
    });
    return;
  }

  let body: RequestBody;
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as RequestBody)
        : ((req.body ?? {}) as RequestBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_INPUT' });
    return;
  }

  const bodySize = JSON.stringify(body).length;
  if (bodySize > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
    return;
  }

  const planningPrompt = truncate(body.planningPrompt, MAX_PROMPT);
  if (planningPrompt.length < 40) {
    res.status(400).json({ error: 'Training planning prompt is required', code: 'INVALID_INPUT' });
    return;
  }

  if (!body.weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)) {
    res.status(400).json({ error: 'weekStartDate is required', code: 'INVALID_INPUT' });
    return;
  }

  if (!body.intake || typeof body.intake !== 'object') {
    res.status(400).json({ error: 'Coaching questionnaire is required', code: 'INVALID_INPUT' });
    return;
  }

  if (body.model && !isAllowedTrainingPlanModel(body.model)) {
    res.status(400).json({ error: 'Model not allowed', code: 'INVALID_MODEL' });
    return;
  }

  let currentPlan: TrainingPlan | null = null;
  if (body.currentPlan != null) {
    const parsed = safeParseTrainingPlan(body.currentPlan);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid current plan for regeneration', code: 'INVALID_INPUT' });
      return;
    }
    currentPlan = parsed.data;
  }

  try {
    const result = await withTimeout(
      generator.generate({
        weekStartDate: body.weekStartDate,
        intake: body.intake,
        planningPrompt,
        model: body.model,
        catalogContext: body.catalogContext ?? {},
        adjustmentInstruction: truncate(body.adjustmentInstruction, 1_000) || undefined,
        currentPlan,
      }),
      REQUEST_TIMEOUT_MS,
    );

    res.status(200).json({
      plan: result.plan,
      modelUsed: result.modelUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    const name = err instanceof Error ? err.name : '';
    if (message === 'TIMEOUT') {
      res.status(504).json({ error: 'AI request timed out. Try again.', code: 'TIMEOUT' });
      return;
    }
    if (message === 'EMPTY_AI_OUTPUT' || message === 'INVALID_AI_JSON') {
      res.status(502).json({
        error: 'The AI returned an unusable training plan. Try again or continue manually.',
        code: 'INVALID_AI_OUTPUT',
      });
      return;
    }
    if (message.includes('rate_limit') || message.includes('429')) {
      res.status(429).json({ error: 'Rate limited. Wait a moment and try again.', code: 'RATE_LIMIT' });
      return;
    }
    const looksLikeZod =
      name === 'ZodError' ||
      (message.trimStart().startsWith('[') && message.includes('"path"'));
    if (looksLikeZod) {
      console.error('training-plan validation failed', message.slice(0, 500));
      res.status(502).json({
        error: 'The AI returned an invalid structured plan. Try again.',
        code: 'INVALID_AI_OUTPUT',
      });
      return;
    }
    console.error('training-plan handler failed', message);
    res.status(500).json({
      error: 'AI training planning failed. Your answers are preserved — try again or plan manually.',
      code: 'SERVER_ERROR',
    });
  }
}
