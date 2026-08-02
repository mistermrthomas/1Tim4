import type { TrainingPlan } from '../../../shared/trainingPlanSchema';
import { safeParseTrainingPlan } from '../../../shared/trainingPlanSchema';
import type { TrainingCoachingIntake } from '../weeklyPlan/types';

export interface TrainingPlanRequest {
  weekStartDate: string;
  intake: TrainingCoachingIntake;
  planningPrompt: string;
  model?: string;
  catalogContext: unknown;
  adjustmentInstruction?: string;
  currentPlan?: TrainingPlan;
}

export type TrainingPlanClientErrorCode =
  | 'MISSING_CONFIGURATION'
  | 'INVALID_INPUT'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'INVALID_AI_OUTPUT'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class TrainingPlanClientError extends Error {
  code: TrainingPlanClientErrorCode;
  status?: number;

  constructor(message: string, code: TrainingPlanClientErrorCode, status?: number) {
    super(message);
    this.name = 'TrainingPlanClientError';
    this.code = code;
    this.status = status;
  }
}

export async function requestTrainingPlan(body: TrainingPlanRequest): Promise<{
  plan: TrainingPlan;
  modelUsed: string;
}> {
  let res: Response;
  try {
    res = await fetch('/api/ai/training-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TrainingPlanClientError(
      'Network error. Check your connection, then try again.',
      'NETWORK',
    );
  }

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    plan?: unknown;
    modelUsed?: string;
  };

  if (!res.ok) {
    const code = (payload.code as TrainingPlanClientErrorCode) || 'SERVER_ERROR';
    throw new TrainingPlanClientError(
      payload.error || 'AI training planning failed.',
      code,
      res.status,
    );
  }

  const parsed = safeParseTrainingPlan(payload.plan);
  if (!parsed.success) {
    throw new TrainingPlanClientError(
      'The AI returned an invalid training plan.',
      'INVALID_AI_OUTPUT',
      res.status,
    );
  }

  return {
    plan: parsed.data,
    modelUsed: payload.modelUsed || 'unknown',
  };
}
