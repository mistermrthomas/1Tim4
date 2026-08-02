import { z } from 'zod';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

const nonEmpty = (min: number, max: number) => z.string().trim().min(min).max(max);

export const sermonWeekdaySchema = z.enum(WEEKDAYS);

export const sermonPlanDaySchema = z.object({
  day: sermonWeekdaySchema,
  dailyFocus: nonEmpty(8, 220),
  scripture: z.array(nonEmpty(3, 80)).min(1).max(4),
  explanation: nonEmpty(40, 900),
  morningPractice: z.array(nonEmpty(8, 280)).min(1).max(4),
  middayCheckpoint: nonEmpty(8, 280),
  eveningReflection: z.array(nonEmpty(8, 280)).min(1).max(4),
  concreteAction: nonEmpty(12, 320),
});

export const sermonPlanSaturdaySchema = z.object({
  sabbathFocus: nonEmpty(12, 320),
  reflectionQuestions: z.array(nonEmpty(8, 280)).min(3).max(8),
  carryForwardQuestion: nonEmpty(12, 280),
});

export const sermonPlanSchema = z
  .object({
    weeklyTitle: nonEmpty(4, 120),
    centralTruth: nonEmpty(20, 480),
    primaryScripture: nonEmpty(3, 80),
    supportingScriptures: z.array(nonEmpty(3, 80)).max(6),
    whyThisMatters: nonEmpty(20, 600),
    weeklyPractice: nonEmpty(20, 400),
    actOfObedience: nonEmpty(20, 400),
    watchFor: z.array(nonEmpty(4, 160)).min(1).max(6),
    weeklyPrayer: nonEmpty(20, 500),
    days: z.array(sermonPlanDaySchema).length(5),
    saturday: sermonPlanSaturdaySchema,
  })
  .superRefine((plan, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < plan.days.length; i += 1) {
      const day = plan.days[i]!;
      if (day.day !== WEEKDAYS[i]) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'day'],
          message: `Expected ${WEEKDAYS[i]} in order`,
        });
      }
      if (seen.has(day.day)) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'day'],
          message: 'Duplicate weekday',
        });
      }
      seen.add(day.day);
    }
  });

export type SermonPlan = z.infer<typeof sermonPlanSchema>;
export type SermonPlanDay = z.infer<typeof sermonPlanDaySchema>;

/** JSON Schema for OpenAI structured outputs (strict). */
export const sermonPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'weeklyTitle',
    'centralTruth',
    'primaryScripture',
    'supportingScriptures',
    'whyThisMatters',
    'weeklyPractice',
    'actOfObedience',
    'watchFor',
    'weeklyPrayer',
    'days',
    'saturday',
  ],
  properties: {
    weeklyTitle: { type: 'string' },
    centralTruth: { type: 'string' },
    primaryScripture: { type: 'string' },
    supportingScriptures: { type: 'array', items: { type: 'string' } },
    whyThisMatters: { type: 'string' },
    weeklyPractice: { type: 'string' },
    actOfObedience: { type: 'string' },
    watchFor: { type: 'array', items: { type: 'string' } },
    weeklyPrayer: { type: 'string' },
    days: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'day',
          'dailyFocus',
          'scripture',
          'explanation',
          'morningPractice',
          'middayCheckpoint',
          'eveningReflection',
          'concreteAction',
        ],
        properties: {
          day: { type: 'string', enum: [...WEEKDAYS] },
          dailyFocus: { type: 'string' },
          scripture: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          morningPractice: { type: 'array', items: { type: 'string' } },
          middayCheckpoint: { type: 'string' },
          eveningReflection: { type: 'array', items: { type: 'string' } },
          concreteAction: { type: 'string' },
        },
      },
    },
    saturday: {
      type: 'object',
      additionalProperties: false,
      required: ['sabbathFocus', 'reflectionQuestions', 'carryForwardQuestion'],
      properties: {
        sabbathFocus: { type: 'string' },
        reflectionQuestions: { type: 'array', items: { type: 'string' } },
        carryForwardQuestion: { type: 'string' },
      },
    },
  },
} as const;

export function parseSermonPlan(data: unknown): SermonPlan {
  return sermonPlanSchema.parse(data);
}

export function safeParseSermonPlan(data: unknown) {
  return sermonPlanSchema.safeParse(data);
}
