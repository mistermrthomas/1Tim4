import { describe, expect, it } from 'vitest';
import { normalizePassageReference, slicePassageForMode, type WebPassage } from './fetchWebPassage';

describe('fetchWebPassage helpers', () => {
  it('normalizes a standard reference', () => {
    expect(normalizePassageReference('Philippians 4:6-7')).toBe('Philippians 4:6-7');
  });

  it('takes the first reference when multiple are listed', () => {
    expect(normalizePassageReference('John 15:1-5; Galatians 5:22')).toBe('John 15:1-5');
  });

  it('slices passage text for short and two-minute modes without inventing wording', () => {
    const passage: WebPassage = {
      reference: 'John 3:16-17',
      translationId: 'web',
      translationName: 'World English Bible',
      attribution: 'World English Bible (public domain)',
      text: 'Full text',
      verses: [
        { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world…' },
        { book: 'John', chapter: 3, verse: 17, text: 'For God didn’t send his Son…' },
      ],
    };
    const two = slicePassageForMode(passage, 'two_minute');
    expect(two.verses).toHaveLength(1);
    expect(two.text).toContain('For God so loved');
    expect(two.truncated).toBe(true);
  });
});
