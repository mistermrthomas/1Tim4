import { describe, expect, it } from 'vitest';
import { isMeaningfulAccountBag } from './accountBags';

describe('isMeaningfulAccountBag', () => {
  it('treats empty strength as not meaningful', () => {
    expect(
      isMeaningfulAccountBag('strength', { version: 1, entries: [], workoutNotes: [] }),
    ).toBe(false);
  });

  it('treats strength with entries as meaningful', () => {
    expect(
      isMeaningfulAccountBag('strength', {
        version: 1,
        entries: [{ id: '1' }],
        workoutNotes: [],
      }),
    ).toBe(true);
  });

  it('treats empty walking as not meaningful', () => {
    expect(isMeaningfulAccountBag('walking', { version: 1, entries: [] })).toBe(false);
  });

  it('treats biblical day map with keys as meaningful', () => {
    expect(
      isMeaningfulAccountBag('biblical_day', {
        '2026-08-05': { dateKey: '2026-08-05', practiceDone: true },
      }),
    ).toBe(true);
  });
});
