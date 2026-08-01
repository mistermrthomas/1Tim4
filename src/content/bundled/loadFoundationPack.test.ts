import { describe, expect, it } from 'vitest';
import { loadFoundationPack } from './loadFoundationPack';
import { resolveDailySnapshot } from '../runtime/resolveDailySnapshot';
import { resolveScriptureFromPack } from '../runtime/resolveScriptureFromPack';

describe('foundation pack', () => {
  it('loads with valid checksum and resolves daily + scripture', async () => {
    const pack = await loadFoundationPack();
    expect(pack.manifest.packId).toBe('foundation.core');
    expect(pack.data.workouts.templates).toHaveLength(3);

    const snapshot = resolveDailySnapshot({
      pack,
      focusKey: 'patience',
      stageKey: 'practice',
      morningMode: 'full',
      workoutTemplateId: 'full_body_foundations',
    });
    expect(snapshot.assignmentId).toContain('patience');
    expect(snapshot.referenceId).toBe('matt.5.3-4');

    const scripture = resolveScriptureFromPack(pack, snapshot.referenceId, 'web');
    expect(scripture.mode).toBe('full_text');

    const referenceOnly = resolveScriptureFromPack(
      {
        ...pack,
        data: { ...pack.data, scriptureTexts: [] },
      },
      snapshot.referenceId,
      'web',
    );
    expect(referenceOnly.mode).toBe('reference_only');
  });
});
