import type { SermonPlan } from '../../../shared/sermonPlanSchema';
import { safeParseSermonPlan } from '../../../shared/sermonPlanSchema';

export interface SermonPlanRequest {
  sermonTitle: string;
  sermonDate: string;
  sermonNotes: string;
  primaryScripture?: string;
  sermonSpeaker?: string;
  churchName?: string;
  sermonUrl?: string;
  additionalContext?: string;
  planningPrompt: string;
  model?: string;
  adjustmentInstruction?: string;
  currentPlan?: SermonPlan;
}

export type SermonPlanClientErrorCode =
  | 'MISSING_CONFIGURATION'
  | 'INVALID_INPUT'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'INVALID_AI_OUTPUT'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class SermonPlanClientError extends Error {
  code: SermonPlanClientErrorCode;
  status?: number;

  constructor(message: string, code: SermonPlanClientErrorCode, status?: number) {
    super(message);
    this.name = 'SermonPlanClientError';
    this.code = code;
    this.status = status;
  }
}

export async function requestSermonPlan(body: SermonPlanRequest): Promise<{
  plan: SermonPlan;
  modelUsed: string;
}> {
  let res: Response;
  try {
    res = await fetch('/api/ai/sermon-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SermonPlanClientError(
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
    const code = (payload.code as SermonPlanClientErrorCode) || 'SERVER_ERROR';
    throw new SermonPlanClientError(
      payload.error || 'AI planning failed.',
      code,
      res.status,
    );
  }

  const parsed = safeParseSermonPlan(payload.plan);
  if (!parsed.success) {
    throw new SermonPlanClientError(
      'The AI returned an invalid structured plan.',
      'INVALID_AI_OUTPUT',
      res.status,
    );
  }

  return {
    plan: parsed.data,
    modelUsed: payload.modelUsed || 'unknown',
  };
}

export async function testAiConnection(): Promise<{
  status: 'connected' | 'missing_configuration' | 'failed';
  model?: string;
  via?: string;
  code?: string;
}> {
  try {
    const res = await fetch('/api/ai/connection-test', { method: 'POST' });
    const payload = (await res.json().catch(() => ({}))) as {
      status?: string;
      model?: string;
      via?: string;
      code?: string;
    };
    if (payload.status === 'connected') {
      return { status: 'connected', model: payload.model, via: payload.via };
    }
    if (payload.status === 'missing_configuration' || res.status === 503) {
      return { status: 'missing_configuration', code: payload.code };
    }
    return { status: 'failed', code: payload.code };
  } catch {
    return { status: 'failed', code: 'NETWORK' };
  }
}

export function notesAreMeaningful(notes: string): boolean {
  return notes.trim().length >= 40;
}
