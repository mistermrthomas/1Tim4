import type {
  AnalyzeChurchNotesRequest,
  AnalyzeChurchNotesSuccess,
  StructuredChurchAnalysis,
} from '../../shared/churchNotesAnalysis';

export class ChurchNotesAiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ChurchNotesAiError';
    this.code = code;
    this.status = status;
  }
}

function aiDisabledInClient(): boolean {
  return import.meta.env.VITE_CHURCH_NOTES_AI === 'false';
}

export async function analyzeChurchNotes(
  payload: AnalyzeChurchNotesRequest,
  options?: { accessToken?: string | null; signal?: AbortSignal },
): Promise<AnalyzeChurchNotesSuccess> {
  if (aiDisabledInClient()) {
    throw new ChurchNotesAiError('Church notes AI is disabled', 'not_configured', 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  const onAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onAbort);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options?.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    const res = await fetch('/api/church-notes/analyze', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      analysis?: StructuredChurchAnalysis;
      model?: string;
      promptVersion?: string;
      source?: string;
    };

    if (!res.ok) {
      throw new ChurchNotesAiError(
        data.error || 'Analysis failed',
        data.code || 'provider_error',
        res.status,
      );
    }

    if (!data.analysis || !data.model || !data.promptVersion) {
      throw new ChurchNotesAiError('Invalid analysis response', 'invalid_ai_output', 502);
    }

    return {
      analysis: data.analysis,
      model: data.model,
      promptVersion: data.promptVersion,
      source: 'ai',
    };
  } catch (err) {
    if (err instanceof ChurchNotesAiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ChurchNotesAiError(
        'AI request timed out. Your raw notes were not changed.',
        'timeout',
        504,
      );
    }
    throw new ChurchNotesAiError(
      'Could not reach the analysis service. Your raw notes were preserved.',
      'provider_error',
      502,
    );
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', onAbort);
  }
}
