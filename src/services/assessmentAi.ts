import type { AssessmentFocusKey, AssessmentSuggestion } from '../types';
import { isValidAssessmentFocusKey } from '../../shared/assessmentFocusKeys';

export interface AiAssessmentGuidance {
  focusKey: AssessmentFocusKey;
  whyFocus: string;
}

function aiDisabledInClient(): boolean {
  return import.meta.env.VITE_ASSESSMENT_AI === 'false';
}

/** Calls Vercel `/api/assessment-plan` when OpenAI is configured server-side. */
export async function fetchAiAssessmentGuidance(
  answers: Record<string, string>,
  rulePlan: AssessmentSuggestion,
): Promise<AiAssessmentGuidance | null> {
  if (aiDisabledInClient()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);

  try {
    const res = await fetch('/api/assessment-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        ruleSuggestion: {
          focusKey: rulePlan.focusKey,
          focusTitle: rulePlan.focusTitle,
          whyFocus: rulePlan.whyFocus,
        },
      }),
      signal: controller.signal,
    });

    if (res.status === 503) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as { focusKey?: string; whyFocus?: string };
    if (!data.focusKey || !data.whyFocus) return null;
    if (!isValidAssessmentFocusKey(data.focusKey)) return null;

    const whyFocus = data.whyFocus.trim();
    if (whyFocus.length < 40) return null;

    return {
      focusKey: data.focusKey as AssessmentFocusKey,
      whyFocus,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
