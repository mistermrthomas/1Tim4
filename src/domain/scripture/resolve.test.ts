import { describe, expect, it } from 'vitest';
import { resolveScripture } from './resolve';

const reference = {
  referenceId: 'matt.5.3-4',
  bookCode: 'Matt',
  chapter: 5,
  verseStart: 3,
  verseEnd: 4,
  canonicalLabel: 'Matthew 5:3-4',
};

describe('resolveScripture', () => {
  it('returns full_text when approved translation body exists', () => {
    const result = resolveScripture({
      reference,
      preferredTranslationId: 'web',
      texts: [
        {
          referenceId: 'matt.5.3-4',
          translationId: 'web',
          textBody: 'Blessed are the poor in spirit...',
          attribution: 'WEB',
        },
      ],
    });
    expect(result.mode).toBe('full_text');
    if (result.mode === 'full_text') {
      expect(result.text).toContain('poor in spirit');
    }
  });

  it('returns reference_only when text unavailable', () => {
    const result = resolveScripture({
      reference,
      preferredTranslationId: 'web',
      texts: [],
    });
    expect(result.mode).toBe('reference_only');
  });

  it('labels paraphrase when text unavailable but paraphrase provided', () => {
    const result = resolveScripture({
      reference,
      preferredTranslationId: 'web',
      texts: [],
      paraphrase: 'Jesus blesses those who depend on God.',
    });
    expect(result.mode).toBe('paraphrase');
    if (result.mode === 'paraphrase') {
      expect(result.label).toBe('paraphrase');
    }
  });
});
