import type {
  ResolvedScripture,
  ScriptureReference,
  ScriptureTextRecord,
} from './types';

export interface ResolveScriptureInput {
  reference: ScriptureReference;
  preferredTranslationId: string;
  texts: ScriptureTextRecord[];
  /** When exact text missing and coach needs wording */
  paraphrase?: string;
  translationAllowsOfflineText?: boolean;
}

/**
 * Resolve scripture for display/coaching.
 * Never invents verse wording — paraphrase must be explicitly labeled.
 */
export function resolveScripture(input: ResolveScriptureInput): ResolvedScripture {
  const { reference, preferredTranslationId, texts, paraphrase } = input;

  if (input.translationAllowsOfflineText === false) {
    if (paraphrase?.trim()) {
      return {
        mode: 'paraphrase',
        reference,
        paraphrase: paraphrase.trim(),
        label: 'paraphrase',
      };
    }
    return {
      mode: 'reference_only',
      reference,
      translationId: preferredTranslationId,
      reason: 'license_forbidden',
    };
  }

  const hit = texts.find(
    (t) =>
      t.referenceId === reference.referenceId &&
      t.translationId === preferredTranslationId &&
      t.textBody.trim().length > 0,
  );

  if (hit) {
    return {
      mode: 'full_text',
      reference,
      translationId: hit.translationId,
      text: hit.textBody,
      attribution: hit.attribution,
    };
  }

  if (paraphrase?.trim()) {
    return {
      mode: 'paraphrase',
      reference,
      paraphrase: paraphrase.trim(),
      label: 'paraphrase',
    };
  }

  return {
    mode: 'reference_only',
    reference,
    translationId: preferredTranslationId,
    reason: 'text_unavailable',
  };
}

/** Reject AI output that looks like a fabricated quotation when no approved text was supplied. */
export function looksLikeUncitedQuotation(body: string, approvedTexts: string[]): boolean {
  const quoteBlocks = body.match(/[“"]([^”"]{20,})[”"]/g) ?? [];
  if (quoteBlocks.length === 0) return false;
  return quoteBlocks.some((block) => {
    const inner = block.replace(/^[“"]|[”"]$/g, '').trim();
    return !approvedTexts.some((t) => t.includes(inner) || inner.includes(t.slice(0, 40)));
  });
}
