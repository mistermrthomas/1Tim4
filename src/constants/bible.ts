/** Default translation across Path (display, links, memorization). */
export const BIBLE_TRANSLATION = 'NASB';

export const BIBLE_TRANSLATION_LABEL = 'New American Standard Bible (NASB)';

/** @deprecated Use BIBLE_TRANSLATION — kept for imports */
export const MEMORIZATION_TRANSLATION = BIBLE_TRANSLATION;

/** @deprecated Use BIBLE_TRANSLATION_LABEL */
export const MEMORIZATION_TRANSLATION_LABEL = BIBLE_TRANSLATION_LABEL;

const TRANSLATION_LABELS: Record<string, string> = {
  NASB: BIBLE_TRANSLATION_LABEL,
  NIV: 'New International Version (NIV)',
};

/** Display label for stored translation codes (e.g. from older assessments). */
export function bibleTranslationDisplay(code?: string | null): string {
  if (!code) return BIBLE_TRANSLATION_LABEL;
  return TRANSLATION_LABELS[code] ?? code;
}
