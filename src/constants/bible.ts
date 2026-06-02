/** Translation for training / memorization verses */
export const MEMORIZATION_TRANSLATION = 'NASB';

export const MEMORIZATION_TRANSLATION_LABEL = 'New American Standard Bible (NASB)';

/** Translation for chapter reading links (YouVersion / Bible Gateway) */
export const BIBLE_TRANSLATION = 'NIV';

export const BIBLE_TRANSLATION_LABEL = 'New International Version (NIV)';

const TRANSLATION_LABELS: Record<string, string> = {
  NASB: MEMORIZATION_TRANSLATION_LABEL,
  NIV: BIBLE_TRANSLATION_LABEL,
};

/** Display label for stored translation codes (e.g. from older assessments). */
export function bibleTranslationDisplay(code?: string | null): string {
  if (!code) return MEMORIZATION_TRANSLATION_LABEL;
  return TRANSLATION_LABELS[code] ?? code;
}
