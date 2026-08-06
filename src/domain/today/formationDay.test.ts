import { describe, expect, it } from 'vitest';
import {
  becomingStatement,
  formationDayKind,
  formationDayLabel,
  morningReflectionQuestion,
} from './formationDay';

describe('formationDay helpers', () => {
  it('maps weekdays to progressive kinds', () => {
    expect(formationDayKind(2)).toBe('understand');
    expect(formationDayKind(5)).toBe('apply');
    expect(formationDayKind(6)).toBe('obey');
  });

  it('builds a becoming statement without repeating the prefix', () => {
    expect(becomingStatement('Embracing truth when it is uncomfortable', 'Theme')).toBe(
      'Today you are training: embracing truth when it is uncomfortable',
    );
  });

  it('returns a Monday morning question', () => {
    expect(morningReflectionQuestion(2).toLowerCase()).toContain('stood out');
    expect(formationDayLabel(2)).toContain('Monday');
  });
});
