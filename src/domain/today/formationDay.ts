import type { MorningMode } from '../formation/types';
import type { BiblicalDailyAssignment, WeeklyPlan } from '../weeklyPlan/types';

export type FormationDayKind =
  | 'sunday'
  | 'understand'
  | 'notice'
  | 'practice'
  | 'apply'
  | 'obey'
  | 'sabbath';

const DAY_KIND_BY_NUMBER: Record<number, FormationDayKind> = {
  1: 'sunday',
  2: 'understand',
  3: 'notice',
  4: 'practice',
  5: 'apply',
  6: 'obey',
  7: 'sabbath',
};

const DAY_LABEL: Record<FormationDayKind, string> = {
  sunday: 'Sunday · Capture the sermon',
  understand: 'Monday · Understand the teaching',
  notice: 'Tuesday · Notice habits and resistance',
  practice: 'Wednesday · Practice the response',
  apply: 'Thursday · Apply in relationships and work',
  obey: 'Friday · Take a concrete act of obedience',
  sabbath: 'Saturday · Reflect and recover',
};

const MORNING_QUESTIONS: Record<FormationDayKind, string> = {
  sunday: 'What from Sunday’s message do you need to remember this week?',
  understand: 'What word or phrase stood out as you read?',
  notice: 'Where do you naturally resist this teaching?',
  practice: 'What part of this passage challenges you?',
  apply: 'What do you notice about God, people, or obedience here?',
  obey: 'Where might this be tested today — work, family, conflict, or habit?',
  sabbath: 'What from this week should continue into next week?',
};

const EVENING_DEFAULTS = [
  'Where was today’s truth tested?',
  'How did you respond?',
  'What evidence of growth did you see?',
  'Where did you need repentance or another attempt?',
  'What should carry into tomorrow?',
];

export function formationDayKind(dayNumber: number): FormationDayKind {
  return DAY_KIND_BY_NUMBER[dayNumber] ?? 'understand';
}

export function formationDayLabel(dayNumber: number): string {
  return DAY_LABEL[formationDayKind(dayNumber)];
}

export function morningReflectionQuestion(dayNumber: number): string {
  return MORNING_QUESTIONS[formationDayKind(dayNumber)];
}

export function becomingStatement(focus: string, theme: string): string {
  const line = (focus || theme).trim();
  if (!line) return 'Today you are training: staying faithful to Scripture.';
  const normalized = line.replace(/^today you are training:\s*/i, '').trim();
  return `Today you are training: ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
}

export function eveningQuestionsForDay(day: BiblicalDailyAssignment | null): string[] {
  const fromPlan = (day?.eveningPrompt ?? '')
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((s) => s.length >= 8);
  if (fromPlan.length >= 2) return fromPlan.slice(0, 5);
  return EVENING_DEFAULTS;
}

export function greetingForNow(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Full weekday, month, day, year — e.g. Thursday, August 6, 2026 */
export function formatFormationDate(now = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Local time with AM/PM — e.g. 6:34 AM */
export function formatFormationTime(now = new Date()): string {
  return now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function resolveActiveDay(
  plan: WeeklyPlan,
  dateKey: string,
): BiblicalDailyAssignment | null {
  return plan.biblical.days.find((d) => d.date === dateKey) ?? null;
}

export function sermonConnectionCopy(plan: WeeklyPlan, day: BiblicalDailyAssignment | null): {
  centralTruth: string;
  connection: string;
  aiLabeled: boolean;
} {
  const centralTruth =
    plan.biblical.centralPrinciple ||
    plan.church.centralTruth ||
    plan.biblical.weeklyTheme ||
    'Stay with Sunday’s teaching.';
  const teaching = day?.teaching?.trim() || '';
  const connection =
    teaching ||
    `Today’s passage continues Sunday’s call: ${centralTruth}`;
  return {
    centralTruth,
    connection: connection.slice(0, 700),
    aiLabeled: Boolean(plan.biblical.aiProposal || plan.aiMeta?.generationSource?.startsWith('ai')),
  };
}

export type { MorningMode };
