import {
  MAX_BODY_CHARS,
  validateAnalyzeRequest,
  type AnalyzeChurchNotesSuccess,
} from '../../shared/churchNotesAnalysis';
import { authorizeChurchNotesRequest } from '../_lib/churchNotesAuth';
import {
  analyzeChurchNotesWithOpenAI,
  getConfiguredModel,
  logChurchNotesUsage,
} from '../_lib/churchNotesOpenAi';
import { beginIdempotentRequest, endIdempotentRequest } from '../_lib/idempotency';
import { checkRateLimit } from '../_lib/rateLimit';

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (raw) return String(raw).split(',')[0]!.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function parseBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await authorizeChurchNotesRequest(req.headers);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error, code: 'unauthorized' });
    return;
  }

  const rate = checkRateLimit(`church-notes:${auth.userId}:${clientIp(req)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    res.status(429).json({
      error: 'Too many analysis requests. Wait a moment and try again.',
      code: 'rate_limited',
    });
    return;
  }

  const body = parseBody(req.body);
  if (body == null) {
    res.status(400).json({ error: 'Invalid JSON body', code: 'validation' });
    return;
  }

  const serialized = JSON.stringify(body);
  if (serialized.length > MAX_BODY_CHARS) {
    res.status(413).json({ error: 'Payload too large', code: 'payload_too_large' });
    return;
  }

  const validated = validateAnalyzeRequest(body);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error, code: 'validation' });
    return;
  }

  const idem = beginIdempotentRequest(auth.userId, validated.value.requestId);
  if (!idem.ok) {
    res.status(409).json({
      error: 'Analysis already in progress for this request',
      code: 'duplicate',
    });
    return;
  }

  try {
    const result = await analyzeChurchNotesWithOpenAI(validated.value);
    if (!result.ok) {
      const err = result.error;
      if (err.kind === 'not_configured') {
        logChurchNotesUsage({
          userId: auth.userId,
          model: getConfiguredModel(),
          rawNotesLength: validated.value.rawNotes.length,
          ok: false,
          code: 'not_configured',
        });
        res.status(503).json({ error: 'Church notes AI is not configured', code: 'not_configured' });
        return;
      }
      if (err.kind === 'timeout') {
        logChurchNotesUsage({
          userId: auth.userId,
          model: getConfiguredModel(),
          rawNotesLength: validated.value.rawNotes.length,
          ok: false,
          code: 'timeout',
        });
        res.status(504).json({
          error: 'AI request timed out. Your raw notes were not changed — try again.',
          code: 'timeout',
        });
        return;
      }
      if (err.kind === 'invalid_output') {
        logChurchNotesUsage({
          userId: auth.userId,
          model: getConfiguredModel(),
          rawNotesLength: validated.value.rawNotes.length,
          ok: false,
          code: 'invalid_ai_output',
        });
        res.status(502).json({
          error: `AI returned invalid output: ${err.detail}. Retry without losing your notes.`,
          code: 'invalid_ai_output',
        });
        return;
      }
      logChurchNotesUsage({
        userId: auth.userId,
        model: getConfiguredModel(),
        rawNotesLength: validated.value.rawNotes.length,
        ok: false,
        code: 'provider_error',
      });
      res.status(502).json({
        error: 'AI provider error. Your raw notes were preserved — you can retry.',
        code: 'provider_error',
      });
      return;
    }

    logChurchNotesUsage({
      userId: auth.userId,
      model: result.value.model,
      rawNotesLength: validated.value.rawNotes.length,
      ok: true,
    });

    const payload: AnalyzeChurchNotesSuccess = {
      analysis: result.value.analysis,
      model: result.value.model,
      promptVersion: result.value.promptVersion,
      source: 'ai',
    };
    res.status(200).json(payload);
  } catch (err) {
    console.error('church-notes analyze', err instanceof Error ? err.message : 'failed');
    res.status(500).json({
      error: 'Analysis failed. Your raw notes were not changed.',
      code: 'provider_error',
    });
  } finally {
    endIdempotentRequest(auth.userId, validated.value.requestId);
  }
}
