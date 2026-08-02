import { describe, expect, it } from 'vitest';
import { coerceSermonPlanCandidate, safeParseSermonPlan } from './sermonPlanSchema';

function samplePlan() {
  return {
    weeklyTitle: 'Living the sermon',
    centralTruth: 'Based on your notes, the call is to practice mercy when interrupted.',
    primaryScripture: 'Matthew 5:7',
    supportingScriptures: ['Micah 6:8'],
    whyThisMatters: 'The sermon pressed mercy into ordinary pressure, not abstract kindness.',
    weeklyPractice: 'When interrupted, pause and ask one clarifying question before reacting.',
    actOfObedience: 'Choose one relationship this week and practice that pause once daily.',
    watchFor: ['hurried replies', 'defensive tone'],
    weeklyPrayer: 'Lord, form mercy in me when I feel pressed.',
    days: (
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
    ).map((day) => ({
      day,
      dailyFocus: `Focus for ${day} that builds on the sermon`,
      scripture: ['Matthew 5:7'],
      explanation:
        'Based on your notes, this day helps you notice and practice the same central truth.',
      morningPractice: ['Read the verse slowly and name one place it may meet you today.'],
      middayCheckpoint: 'Have you practiced once yet?',
      eveningReflection: ['Where did you practice — or avoid — the concrete action?'],
      concreteAction: `Do one observable act related to ${day} that matches the weekly practice.`,
    })),
    saturday: {
      sabbathFocus: 'Rest and reflect on how the sermon shaped the week.',
      reflectionQuestions: [
        'What did God show me this week?',
        'Where did I practice rather than merely remember?',
        'Where did I resist?',
      ],
      carryForwardQuestion: 'What one practice should carry into next week?',
    },
  };
}

describe('sermonPlanSchema', () => {
  it('accepts a complete monday–friday plan', () => {
    const result = safeParseSermonPlan(samplePlan());
    expect(result.success).toBe(true);
  });

  it('rejects wrong weekday order', () => {
    const plan = samplePlan();
    plan.days[0]!.day = 'tuesday';
    const result = safeParseSermonPlan(plan);
    expect(result.success).toBe(false);
  });

  it('coerces short Saturday reflection lists up to three questions', () => {
    const plan = samplePlan();
    plan.saturday.reflectionQuestions = ['What stayed with me this week?'];
    const coerced = coerceSermonPlanCandidate(plan) as typeof plan;
    expect(coerced.saturday.reflectionQuestions.length).toBeGreaterThanOrEqual(3);
    expect(safeParseSermonPlan(plan).success).toBe(true);
  });
});
