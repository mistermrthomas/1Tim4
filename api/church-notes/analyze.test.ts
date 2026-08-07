import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorizeChurchNotesRequest } from '../_lib/churchNotesAuth';
import { beginIdempotentRequest, endIdempotentRequest, __resetIdempotencyForTests } from '../_lib/idempotency';
import { analyzeChurchNotesWithOpenAI } from '../_lib/churchNotesOpenAi';
import { checkRateLimit, __resetRateLimitBucketsForTests } from '../_lib/rateLimit';
import { emptyStructuredAnalysis, validateStructuredAnalysis } from '../../shared/churchNotesAnalysis';

afterEach(() => {
  __resetRateLimitBucketsForTests();
  __resetIdempotencyForTests();
  vi.unstubAllEnvs();
});

describe('church notes auth', () => {
  it('rejects unauthorized requests when auth is required', async () => {
    const result = await authorizeChurchNotesRequest(
      {},
      {
        requireAuth: true,
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'anon',
        fetchImpl: vi.fn(),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toMatch(/Sign in required/i);
    }
  });

  it('accepts a verified Supabase user JWT', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-123' }),
    });
    const result = await authorizeChurchNotesRequest(
      { authorization: 'Bearer valid-token' },
      {
        requireAuth: true,
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'anon',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe('user-123');
  });

  it('rejects invalid tokens', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const result = await authorizeChurchNotesRequest(
      { authorization: 'Bearer bad' },
      {
        requireAuth: true,
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'anon',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });
});

describe('church notes rate limiting', () => {
  it('blocks after the limit is exceeded', () => {
    const key = 'test-user';
    for (let i = 0; i < 8; i += 1) {
      expect(checkRateLimit(key, { limit: 8, windowMs: 60_000, now: 1_000 }).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, { limit: 8, windowMs: 60_000, now: 1_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('duplicate submission protection', () => {
  it('rejects a second in-flight request with the same requestId', () => {
    expect(beginIdempotentRequest('u1', 'req-1').ok).toBe(true);
    expect(beginIdempotentRequest('u1', 'req-1').ok).toBe(false);
    endIdempotentRequest('u1', 'req-1');
    expect(beginIdempotentRequest('u1', 'req-1').ok).toBe(true);
  });
});

describe('OpenAI analyze error handling', () => {
  it('returns not_configured when API key is missing', async () => {
    const result = await analyzeChurchNotesWithOpenAI(
      {
        sermonDate: '2026-08-02',
        rawNotes: 'Romans 12 notes',
      },
      { apiKey: '' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not_configured');
  });

  it('returns invalid_output when the model returns bad JSON shape', async () => {
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ sermonSummary: 'only this' }),
        }),
      },
    };
    const result = await analyzeChurchNotesWithOpenAI(
      { sermonDate: '2026-08-02', rawNotes: 'notes' },
      { apiKey: 'sk-test', client: client as never },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid_output');
  });

  it('returns provider error on API failure', async () => {
    const client = {
      responses: {
        create: vi.fn().mockRejectedValue(Object.assign(new Error('boom'), { status: 500 })),
      },
    };
    const result = await analyzeChurchNotesWithOpenAI(
      { sermonDate: '2026-08-02', rawNotes: 'notes' },
      { apiKey: 'sk-test', client: client as never },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('provider');
  });

  it('returns success when structured output validates', async () => {
    const analysis = emptyStructuredAnalysis();
    analysis.sermonSummary = 'Summary of intentional formation.';
    analysis.centralMessage = 'Be transformed, not conformed.';
    analysis.weeklyTheme = 'Out-disciple the algorithm';
    analysis.memoryVerse = { reference: 'Romans 12:2', reason: 'Core text' };
    analysis.scripturePassages = [
      { reference: 'Romans 12:1-2', contextFromNotes: 'explicit', confidence: 'explicit' },
    ];
    analysis.sevenDayPlan = Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      theme: 'Theme',
      beforeReadingPrompt: 'Before',
      reflectionQuestion: 'Reflect',
      prayerPrompt: 'Pray',
    }));
    expect(validateStructuredAnalysis(analysis).ok).toBe(true);

    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: JSON.stringify(analysis) }),
      },
    };
    const result = await analyzeChurchNotesWithOpenAI(
      { sermonDate: '2026-08-02', rawNotes: 'Romans 12' },
      { apiKey: 'sk-test', model: 'gpt-4o-mini', client: client as never },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.analysis.weeklyTheme).toMatch(/algorithm/i);
      expect(result.value.model).toBe('gpt-4o-mini');
    }
  });
});
