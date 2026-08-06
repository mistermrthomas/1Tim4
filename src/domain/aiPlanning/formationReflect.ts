/** Client for the single AI follow-up reflection question. */

export type FormationReflectRequest = {
  scriptureReference: string;
  scriptureText?: string;
  sermonTitle?: string;
  sermonCentralTruth?: string;
  sermonNotes?: string;
  observation: string;
  priorJournal?: string;
  reflectPrompt?: string;
};

export async function requestFormationReflect(
  body: FormationReflectRequest,
): Promise<{ question: string; modelUsed?: string }> {
  let res: Response;
  try {
    res = await fetch('/api/ai/formation-reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error while preparing your reflection question.');
  }

  const payload = (await res.json().catch(() => ({}))) as {
    question?: string;
    error?: string;
    modelUsed?: string;
  };

  if (!res.ok || !payload.question?.trim()) {
    throw new Error(payload.error || 'Could not prepare a reflection question.');
  }

  return { question: payload.question.trim(), modelUsed: payload.modelUsed };
}
