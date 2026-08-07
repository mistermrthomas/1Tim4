import OpenAI from 'openai';
import {
  CHURCH_NOTES_JSON_SCHEMA,
  CHURCH_NOTES_PROMPT_VERSION,
  CHURCH_NOTES_SYSTEM_PROMPT,
  buildUserPrompt,
  validateStructuredAnalysis,
  type AnalyzeChurchNotesRequest,
  type StructuredChurchAnalysis,
} from '../../shared/churchNotesAnalysis';

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_TIMEOUT_MS = 45_000;

export interface OpenAiAnalyzeResult {
  analysis: StructuredChurchAnalysis;
  model: string;
  promptVersion: string;
}

export type OpenAiAnalyzeError =
  | { kind: 'timeout' }
  | { kind: 'provider'; status?: number }
  | { kind: 'invalid_output'; detail: string }
  | { kind: 'not_configured' };

export function getConfiguredModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

/**
 * Call OpenAI Responses API with strict structured output.
 * Injectable client for tests.
 */
export async function analyzeChurchNotesWithOpenAI(
  request: AnalyzeChurchNotesRequest,
  options?: {
    apiKey?: string;
    model?: string;
    client?: OpenAI;
    timeoutMs?: number;
  },
): Promise<{ ok: true; value: OpenAiAnalyzeResult } | { ok: false; error: OpenAiAnalyzeError }> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: { kind: 'not_configured' } };
  }

  const model = options?.model ?? getConfiguredModel();
  const client =
    options?.client ??
    new OpenAI({
      apiKey,
      timeout: options?.timeoutMs ?? OPENAI_TIMEOUT_MS,
      maxRetries: 0,
    });

  try {
    const response = await client.responses.create({
      model,
      instructions: CHURCH_NOTES_SYSTEM_PROMPT,
      input: buildUserPrompt(request),
      temperature: 0.35,
      text: {
        format: {
          type: 'json_schema',
          name: 'church_notes_analysis',
          strict: true,
          schema: CHURCH_NOTES_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });

    const content = response.output_text?.trim();
    if (!content) {
      return { ok: false, error: { kind: 'invalid_output', detail: 'Empty AI response' } };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: { kind: 'invalid_output', detail: 'AI response was not valid JSON' } };
    }

    const validated = validateStructuredAnalysis(parsed);
    if (!validated.ok) {
      return { ok: false, error: { kind: 'invalid_output', detail: validated.error } };
    }

    return {
      ok: true,
      value: {
        analysis: validated.value,
        model,
        promptVersion: CHURCH_NOTES_PROMPT_VERSION,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/timeout|aborted|ETIMEDOUT|TimeoutError/i.test(message)) {
      return { ok: false, error: { kind: 'timeout' } };
    }
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status?: number }).status)
        : undefined;
    console.error('church-notes OpenAI error', status ?? message);
    return { ok: false, error: { kind: 'provider', status } };
  }
}

/** Usage log without storing full sermon notes. */
export function logChurchNotesUsage(info: {
  userId: string;
  model: string;
  rawNotesLength: number;
  ok: boolean;
  code?: string;
}): void {
  console.info(
    JSON.stringify({
      event: 'church_notes_analyze',
      userId: info.userId,
      model: info.model,
      rawNotesLength: info.rawNotesLength,
      ok: info.ok,
      code: info.code,
      promptVersion: CHURCH_NOTES_PROMPT_VERSION,
      at: new Date().toISOString(),
    }),
  );
}
