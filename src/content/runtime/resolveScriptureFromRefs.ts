import { resolveScripture } from '../../domain/scripture/resolve';
import type { ResolvedScripture } from '../../domain/scripture/types';
import type { ScriptureReferenceEntry, ScriptureTextEntry } from '../types';

export function resolveScriptureFromRefs(
  references: ScriptureReferenceEntry[],
  texts: ScriptureTextEntry[],
  referenceId: string,
  preferredTranslationId = 'web',
  paraphrase?: string,
): ResolvedScripture {
  const reference = references.find((r) => r.referenceId === referenceId);
  if (!reference) {
    throw new Error(`Unknown referenceId: ${referenceId}`);
  }

  return resolveScripture({
    reference: {
      referenceId: reference.referenceId,
      bookCode: reference.bookCode,
      chapter: reference.chapter,
      verseStart: reference.verseStart,
      verseEnd: reference.verseEnd,
      canonicalLabel: reference.canonicalLabel,
    },
    preferredTranslationId,
    texts: texts.map((t) => ({
      referenceId: t.referenceId,
      translationId: t.translationId,
      textBody: t.textBody,
      attribution: t.attribution,
    })),
    paraphrase,
  });
}
