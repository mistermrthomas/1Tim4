import { describe, expect, it } from 'vitest';
import {
  decideCloudLinkMerge,
  mergeCheckInResponses,
  mergeWorkoutLogs,
} from './merge';

describe('mergeWorkoutLogs', () => {
  it('preserves pain_flag with OR semantics when remote is newer', () => {
    const result = mergeWorkoutLogs({
      local: { revision: 1, painFlag: true, status: 'partial' },
      remote: { revision: 2, painFlag: false, status: 'completed' },
    });
    expect(result.painFlag).toBe(true);
    expect(result.status).toBe('completed');
    expect(result.source).toBe('merged');
  });

  it('preserves pain_flag when local is newer but remote had pain', () => {
    const result = mergeWorkoutLogs({
      local: { revision: 3, painFlag: false, status: 'completed' },
      remote: { revision: 2, painFlag: true, status: 'partial' },
    });
    expect(result.painFlag).toBe(true);
    expect(result.status).toBe('completed');
  });
});

describe('mergeCheckInResponses', () => {
  it('merges by prompt id and prefers non-empty answers', () => {
    const merged = mergeCheckInResponses(
      {
        revision: 2,
        responses: [
          { promptId: 'a', promptText: 'A', answer: '' },
          { promptId: 'b', promptText: 'B', answer: 'local b' },
        ],
      },
      {
        revision: 1,
        responses: [
          { promptId: 'a', promptText: 'A', answer: 'remote a' },
          { promptId: 'c', promptText: 'C', answer: 'remote c' },
        ],
      },
    );
    const byId = Object.fromEntries(merged.map((r) => [r.promptId, r.answer]));
    expect(byId.a).toBe('remote a');
    expect(byId.b).toBe('local b');
    expect(byId.c).toBe('remote c');
  });
});

describe('decideCloudLinkMerge', () => {
  it('never prefers empty cloud over meaningful local', () => {
    expect(
      decideCloudLinkMerge({ localMeaningful: true, cloudMeaningful: false }).action,
    ).toBe('upload_local');
  });
});
