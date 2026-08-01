/** Canonical locator — translation-agnostic. */
export interface ScriptureReference {
  referenceId: string;
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  canonicalLabel: string;
}

export type ScriptureResolveMode = 'full_text' | 'reference_only' | 'paraphrase';

export type ResolvedScripture =
  | {
      mode: 'full_text';
      reference: ScriptureReference;
      translationId: string;
      text: string;
      attribution: string;
    }
  | {
      mode: 'reference_only';
      reference: ScriptureReference;
      translationId: string | null;
      reason: 'text_unavailable' | 'license_forbidden';
    }
  | {
      mode: 'paraphrase';
      reference: ScriptureReference;
      paraphrase: string;
      /** Must be shown in UI — never present paraphrase as quotation. */
      label: 'paraphrase';
    };

export interface ScriptureTextRecord {
  referenceId: string;
  translationId: string;
  textBody: string;
  attribution: string;
}
