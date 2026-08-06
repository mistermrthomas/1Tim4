import { describe, expect, it } from 'vitest';
import {
  becomingStatement,
  formatFormationDate,
  formatFormationTime,
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

  it('formats local date and time for the Today header', () => {
    const sample = new Date(2026, 7, 6, 6, 34, 0);
    expect(formatFormationDate(sample)).toMatch(/August/);
    expect(formatFormationDate(sample)).toMatch(/2026/);
    expect(formatFormationTime(sample)).toMatch(/6:34/);
  });
});
