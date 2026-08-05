import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeNextSlot,
  getNextSlot,
  nextRotationIndex,
  readRotationState,
  STRENGTH_ROTATION,
} from './rotation';

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

describe('strength rotation', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.removeItem('path-strength-rotation-v1');
  });

  it('starts at Workout A and advances without skipping permanently', () => {
    expect(getNextSlot().shortLabel).toBe('Workout A');
    completeNextSlot();
    expect(getNextSlot().shortLabel).toBe('Workout B');
    completeNextSlot();
    expect(getNextSlot().shortLabel).toBe('Recovery / Walk');
    completeNextSlot();
    expect(getNextSlot().shortLabel).toBe('Workout C');
  });

  it('wraps the 7-slot cycle', () => {
    expect(nextRotationIndex(STRENGTH_ROTATION.length - 1)).toBe(0);
    expect(readRotationState().lastCompletedIndex).toBe(-1);
  });
});
