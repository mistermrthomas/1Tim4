import type { GoDeeperResult } from '../types/study';
import { getStudyLinksForReference } from '../utils/studyLinks';

function studyDisabledInClient(): boolean {
  return import.meta.env.VITE_GO_DEEPER_AI === 'false';
}

export async function fetchGoDeeper(
  reference: string,
  options?: { verseText?: string; trainingFocusTitle?: string },
): Promise<GoDeeperResult | null> {
  const ref = reference.trim();
  if (ref.length < 4) return null;

  if (studyDisabledInClient()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 32_000);

  try {
    const res = await fetch('/api/go-deeper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: ref,
        verseText: options?.verseText?.trim() || undefined,
        trainingFocusTitle: options?.trainingFocusTitle?.trim() || undefined,
      }),
      signal: controller.signal,
    });

    if (res.status === 503) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as GoDeeperResult;
    if (!data.setting || !data.reference) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** When AI is off, still offer external study links. */
export function buildLinksOnlyGoDeeper(reference: string): GoDeeperResult | null {
  const links = getStudyLinksForReference(reference);
  if (links.length === 0) return null;
  return {
    reference: reference.trim(),
    setting: '',
    background: '',
    keyWords: [],
    crossReferences: [],
    reflectionQuestion: '',
    disclaimer: 'Open a trusted study site below for NASB text, lexicons, and commentaries.',
    source: 'links',
  };
}

export function getStudyLinks(reference: string) {
  return getStudyLinksForReference(reference);
}
