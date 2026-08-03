import { describe, expect, it } from 'vitest';
import {
  fallbackSermonTitle,
  isGenericSermonTitle,
  isUsableSermonTitle,
  normalizeSermonTitle,
  toTitleCase,
} from './sermonTitle';

describe('sermonTitle helpers', () => {
  it('rejects generic titles', () => {
    expect(isGenericSermonTitle('This Week’s Sermon')).toBe(true);
    expect(isGenericSermonTitle('Sunday Message')).toBe(true);
    expect(isGenericSermonTitle('Growing in Faith')).toBe(true);
    expect(isUsableSermonTitle('Transformed Through Intentional Attention')).toBe(true);
  });

  it('title-cases display titles without quotes', () => {
    expect(toTitleCase('"paying attention to what shapes you"')).toBe(
      'Paying Attention to What Shapes You',
    );
  });

  it('builds a deterministic fallback from central truth', () => {
    const title = fallbackSermonTitle({
      centralTruth: 'Do not conform to this world, but be transformed by renewing your mind.',
    });
    expect(isUsableSermonTitle(title)).toBe(true);
    expect(title.toLowerCase()).not.toContain('add this week');
  });

  it('normalizes empty titles via fallback', () => {
    const title = normalizeSermonTitle('', {
      actOfObedience: 'Choose transformation over conformity in daily influences.',
    });
    expect(title).toMatch(/Transformation|Conformity|Choose/i);
  });
});
