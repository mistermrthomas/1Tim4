import { describe, expect, it } from 'vitest';
import { gateAskCoach } from './intents';

describe('gateAskCoach', () => {
  it('allows normal use under the soft cap', () => {
    expect(gateAskCoach({ askThreadsStarted: 2, askSubstantialExchanges: 1, graceUsed: 0 }).tone).toBe(
      'normal',
    );
  });

  it('nudges near the cap and redirects after grace', () => {
    expect(gateAskCoach({ askThreadsStarted: 9, askSubstantialExchanges: 0, graceUsed: 0 }).tone).toBe(
      'nudge',
    );
    expect(gateAskCoach({ askThreadsStarted: 10, askSubstantialExchanges: 2, graceUsed: 0 }).tone).toBe(
      'grace',
    );
    const redirect = gateAskCoach({
      askThreadsStarted: 12,
      askSubstantialExchanges: 2,
      graceUsed: 2,
    });
    expect(redirect.tone).toBe('redirect');
  });
});
