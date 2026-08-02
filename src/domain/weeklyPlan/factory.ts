import { addDays, endOfWeekSaturday, shortWeekdayLabel, weekRangeFor, type DateKey } from '../calendar/week';
import { readPhysicalPlan } from '../physical/planCatalog';
import { newId } from '../physical/store';
import type {
  BiblicalDailyAssignment,
  ChurchEntry,
  PhysicalDailyAssignment,
  WeeklyPlan,
  WorkDailyAssignment,
  WorkOutcome,
} from './types';
import { emptySaturdayReflection } from './types';

function emptyChurch(sermonDate: DateKey): ChurchEntry {
  return {
    sermonDate,
    sermonTitle: '',
    speaker: '',
    churchName: '',
    primaryScripture: '',
    sermonNotes: '',
    sermonUrl: '',
    centralTruth: '',
    whatNeedsToChange: '',
    whatToPractice: '',
    actOfObedience: '',
    additionalContext: '',
    uncertainty: '',
  };
}

const BIBLICAL_DEFAULTS: Array<Pick<BiblicalDailyAssignment, 'title' | 'focus' | 'teaching'>> = [
  {
    title: 'Capture & choose',
    focus: 'Name the central principle and weekly application',
    teaching: 'Write what the Word pressed on you and choose one measurable practice.',
  },
  {
    title: 'Understand',
    focus: 'Understand the principle',
    teaching: 'Clarify what obedience looks like in ordinary pressure.',
  },
  {
    title: 'Identify resistance',
    focus: 'Identify triggers and recurring situations',
    teaching: 'Name where this practice will be tested.',
  },
  {
    title: 'Practice',
    focus: 'Practice deliberately in a real relationship or situation',
    teaching: 'Act once with observable faithfulness.',
  },
  {
    title: 'Examine motives',
    focus: 'Examine motives, pride, fear, or resistance',
    teaching: 'Ask what still fights the practice.',
  },
  {
    title: 'Review evidence',
    focus: 'Review evidence of application and remaining weakness',
    teaching: 'Record what changed and what remains unfinished.',
  },
  {
    title: 'Sabbath',
    focus: 'Rest',
    teaching: 'No required structured lesson.',
  },
];

export function buildDraftWeeklyPlan(weekStartDate: DateKey): WeeklyPlan {
  const weekEndDate = endOfWeekSaturday(weekStartDate);
  const range = weekRangeFor(parseNoon(weekStartDate));
  const catalog = readPhysicalPlan();
  const now = new Date().toISOString();

  const biblicalDays: BiblicalDailyAssignment[] = range.days.map((day, i) => {
    const def = BIBLICAL_DEFAULTS[i]!;
    const required = day.dayNumber <= 6;
    return {
      id: newId('bday'),
      date: day.dateKey,
      dayNumber: day.dayNumber,
      title: def.title,
      focus: def.focus,
      scripture: '',
      teaching: def.teaching,
      practice: '',
      morningPrompt: required ? 'Where might this principle meet you today?' : '',
      middayPrompt: required ? 'Have you practiced once yet?' : '',
      eveningPrompt: required ? 'What evidence did you see — or avoid?' : '',
      prayer: '',
      isRequired: required,
      enabled: required,
    };
  });

  const physicalDays: PhysicalDailyAssignment[] = range.days.map((day) => {
    const templateId = catalog.weekSchedule[String(day.weekday)] ?? null;
    const template = templateId
      ? catalog.templates.find((t) => t.id === templateId)
      : undefined;
    const isSat = day.dayNumber === 7;
    return {
      id: newId('pday'),
      date: day.dateKey,
      dayNumber: day.dayNumber,
      type: isSat ? 'rest' : template ? 'workout' : 'unscheduled',
      workoutTemplateId: isSat ? null : templateId,
      workoutName: isSat ? 'Sabbath / Full Rest' : (template?.name ?? ''),
      notes: isSat ? 'Rest from structured training.' : '',
      isRequired: !isSat && Boolean(template),
    };
  });

  const outcomes: WorkOutcome[] = [
    { id: newId('wo'), title: '', order: 0 },
    { id: newId('wo'), title: '', order: 1 },
    { id: newId('wo'), title: '', order: 2 },
  ];

  const workDays: WorkDailyAssignment[] = range.days.flatMap((day): WorkDailyAssignment[] => {
    if (day.dayNumber === 7) return [];
    if (day.dayNumber === 1) {
      return [];
    }
    return [
      {
        id: newId('wday'),
        date: day.dateKey,
        dayNumber: day.dayNumber,
        title: '',
        outcomeId: outcomes[0]?.id ?? null,
        priority: 1,
        status: 'open',
        notes: '',
        optional: false,
      },
    ];
  });

  return {
    id: newId('wplan'),
    weekStartDate,
    weekEndDate,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    completedAt: null,
    church: emptyChurch(weekStartDate),
    biblical: {
      sermonSummary: '',
      centralPrinciple: '',
      weeklyTheme: '',
      weeklyPractice: '',
      actOfObedience: '',
      coreScripture: '',
      supportingScriptures: [],
      days: biblicalDays,
      sourceNotes: 'Manual draft — review against Scripture before activating.',
      approved: false,
    },
    physical: {
      desiredWorkoutCount: 4,
      days: physicalDays,
      approved: false,
    },
    work: {
      weeklyOutcomes: outcomes,
      avoidedTask: '',
      deadlines: '',
      delegatedItems: '',
      deferredItems: '',
      constraints: '',
      days: workDays,
      approved: false,
    },
    saturdayReflection: emptySaturdayReflection(),
  };
}

function parseNoon(dateKey: DateKey): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function applyBiblicalDefaultsFromChurch(plan: WeeklyPlan): WeeklyPlan {
  const scripture = plan.church.primaryScripture.trim();
  const practice =
    plan.church.whatToPractice.trim() ||
    plan.biblical.weeklyPractice ||
    'Define one observable practice for this week.';
  const obedience =
    plan.church.actOfObedience.trim() || plan.biblical.actOfObedience || practice;
  const theme =
    plan.biblical.weeklyTheme ||
    plan.church.centralTruth.trim() ||
    plan.church.sermonTitle.trim() ||
    'Weekly biblical focus';

  return {
    ...plan,
    biblical: {
      ...plan.biblical,
      weeklyTheme: theme,
      weeklyPractice: practice,
      actOfObedience: obedience,
      coreScripture: scripture || plan.biblical.coreScripture,
      centralPrinciple:
        plan.biblical.centralPrinciple ||
        plan.church.centralTruth.trim() ||
        'Name the central truth from the sermon.',
      sermonSummary:
        plan.biblical.sermonSummary ||
        (plan.church.sermonNotes.trim()
          ? plan.church.sermonNotes.trim().slice(0, 480)
          : ''),
      days: plan.biblical.days.map((day) => ({
        ...day,
        scripture: day.scripture || scripture,
        practice: day.dayNumber <= 6 ? day.practice || practice : day.practice,
        focus: day.focus,
      })),
      sourceNotes:
        'Draft from sermon notes and weekly biblical focus. Review against Scripture before activating.',
    },
    updatedAt: new Date().toISOString(),
  };
}

export function suggestPhysicalSchedule(plan: WeeklyPlan, desiredCount = 4): WeeklyPlan {
  const catalog = readPhysicalPlan();
  const strength = catalog.templates.filter(
    (t) => t.exercises.length > 0 && !/recovery|conditioning/i.test(t.name),
  );
  const recovery = catalog.templates.find((t) => /recovery/i.test(t.name));
  const pick = (i: number) => strength[i % Math.max(strength.length, 1)];

  // Suggested: Sun, Mon, Wed, Thu strength; Tue recovery; Fri optional; Sat rest
  const pattern: Array<'workout' | 'recovery' | 'optional_movement' | 'rest'> = [
    'workout',
    'workout',
    'recovery',
    'workout',
    'workout',
    'optional_movement',
    'rest',
  ];

  let workoutIdx = 0;
  const days = plan.physical.days.map((day, i) => {
    const kind = pattern[i] ?? 'unscheduled';
    if (kind === 'rest') {
      return {
        ...day,
        type: 'rest' as const,
        workoutTemplateId: null,
        workoutName: 'Sabbath / Full Rest',
        isRequired: false,
        notes: 'Rest from structured training.',
      };
    }
    if (kind === 'recovery') {
      return {
        ...day,
        type: 'recovery' as const,
        workoutTemplateId: recovery?.id ?? null,
        workoutName: recovery?.name ?? 'Recovery',
        isRequired: false,
        notes: 'Recovery or steps focus.',
      };
    }
    if (kind === 'optional_movement') {
      return {
        ...day,
        type: 'optional_movement' as const,
        workoutTemplateId: null,
        workoutName: 'Optional movement / make-up',
        isRequired: false,
        notes: '',
      };
    }
    if (workoutIdx >= desiredCount) {
      return {
        ...day,
        type: 'unscheduled' as const,
        workoutTemplateId: null,
        workoutName: '',
        isRequired: false,
        notes: '',
      };
    }
    const tmpl = pick(workoutIdx);
    workoutIdx += 1;
    return {
      ...day,
      type: 'workout' as const,
      workoutTemplateId: tmpl?.id ?? null,
      workoutName: tmpl?.name ?? 'Workout',
      isRequired: true,
      notes: '',
    };
  });

  return {
    ...plan,
    physical: {
      ...plan.physical,
      desiredWorkoutCount: desiredCount,
      days,
      approved: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function daySummaryLabel(dayNumber: number, title: string): string {
  return `${shortWeekdayLabel(dayNumber)} · ${title}`;
}

export { addDays };
