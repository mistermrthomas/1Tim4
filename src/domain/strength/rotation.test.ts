import { beforeEach, describe, expect, it } from 'vitest';
import { getNextSlot, nextRotationIndex, readRotationState, STRENGTH_ROTATION } from './rotation';

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => map.clear(),
    },
  });
}

describe('strength rotation helpers', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.removeItem('path-strength-rotation-v1');
  });

  it('resolves today’s slot from the calendar schedule, not completion order', () => {
    // Thursday Aug 6, 2026 — must be Workout A even if nothing was completed.
    expect(getNextSlot(readRotationState(), '2026-08-06').shortLabel).toBe('Workout A');
    expect(getNextSlot(readRotationState(), '2026-08-05').shortLabel).toBe('Recovery');
  });

  it('wraps the legacy 7-slot cycle index helper', () => {
    expect(nextRotationIndex(STRENGTH_ROTATION.length - 1)).toBe(0);
    expect(readRotationState().lastCompletedIndex).toBe(-1);
  });
});
