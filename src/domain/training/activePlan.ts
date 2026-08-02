import type { InstalledSeasonPack } from '../../content/types';

export const PLAN_CONFIG_STORAGE_KEY = 'path-plan-config-v1';

/** Minimal day snapshot for building Today’s assignment brief. */
export interface DailyBriefSource {
  primaryFocus: string;
  week: { weekIndex: number; theme: string };
  day: { dayInWeek: number };
  scriptureLabel: string;
  teachingTitle: string;
  practicePrompt: string;
  workoutTitle: string | null;
  recoveryTitle: string | null;
  workoutSetCount: number;
  exerciseCount?: number;
}

export interface PlanWeekTheme {
  weekIndex: number;
  theme: string;
  intent: string;
}

export interface PlanPhysicalTrack {
  primaryGoal: string;
  workoutsPerWeek: number;
  rotation: string[];
  foundations: {
    proteinG: number;
    waterOz: number;
    movement: string;
    recovery: string;
  };
}

/** Editable plan configuration — overrides pack defaults when present. */
export interface PlanConfig {
  programName: string;
  seasonNumber: number;
  seasonTitle: string;
  durationWeeks: number;
  primaryGoal: string;
  secondaryGoal: string;
  weeklyThemes: PlanWeekTheme[];
  physical: PlanPhysicalTrack;
}

export interface ActivePlan {
  programName: string;
  seasonNumber: number;
  seasonTitle: string;
  durationWeeks: number;
  seasonSummary: string;
  spiritual: {
    primaryGoal: string;
    secondaryGoal: string;
    weeklyProgression: PlanWeekTheme[];
  };
  physical: PlanPhysicalTrack;
  hierarchy: {
    program: string;
    season: string;
    weekLabel: string;
    dayLabel: string;
  };
}

export interface DailyBrief {
  focus: string;
  hierarchyLine: string;
  spiritual: string[];
  physical: string[];
}

function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function emptyPhysicalTrack(): PlanPhysicalTrack {
  return {
    primaryGoal: '',
    workoutsPerWeek: 4,
    rotation: [],
    foundations: {
      proteinG: 120,
      waterOz: 80,
      movement: 'Complete scheduled workout or walk',
      recovery: 'Protect bedtime',
    },
  };
}

/** Blank editable config — does not import sample season titles or Full Body A. */
export function buildDefaultPlanConfig(pack?: InstalledSeasonPack): PlanConfig {
  const weekCount = pack?.data.season.weekCount ?? 6;
  return {
    programName: 'PATH',
    seasonNumber: 1,
    seasonTitle: '',
    durationWeeks: weekCount,
    primaryGoal: '',
    secondaryGoal: '',
    weeklyThemes: Array.from({ length: weekCount }, (_, i) => ({
      weekIndex: i + 1,
      theme: '',
      intent: '',
    })),
    physical: emptyPhysicalTrack(),
  };
}

export function readPlanConfig(): PlanConfig | null {
  try {
    const raw = localStorage.getItem(PLAN_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlanConfig;
  } catch {
    return null;
  }
}

export function writePlanConfig(config: PlanConfig): void {
  localStorage.setItem(PLAN_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearPlanConfig(): void {
  localStorage.removeItem(PLAN_CONFIG_STORAGE_KEY);
}

export function resolvePlanConfig(pack?: InstalledSeasonPack): PlanConfig {
  const defaults = buildDefaultPlanConfig(pack);
  const stored = readPlanConfig();
  if (!stored) return defaults;
  // Drop legacy sample season titles left from earlier seeds.
  const cleaned = { ...stored };
  if (/patience under pressure/i.test(cleaned.seasonTitle ?? '')) {
    cleaned.seasonTitle = '';
    cleaned.primaryGoal = '';
    cleaned.secondaryGoal = '';
  }
  if (cleaned.physical?.rotation?.some((r) => /full body [ab]/i.test(r))) {
    cleaned.physical = { ...cleaned.physical, rotation: [] };
  }
  return {
    ...defaults,
    ...cleaned,
    weeklyThemes:
      cleaned.weeklyThemes?.length === defaults.weeklyThemes.length
        ? cleaned.weeklyThemes.map((w) =>
            /pressure|patience/i.test(w.theme) ? { ...w, theme: '', intent: '' } : w,
          )
        : defaults.weeklyThemes,
    physical: {
      ...defaults.physical,
      ...cleaned.physical,
      foundations: {
        ...defaults.physical.foundations,
        ...cleaned.physical?.foundations,
      },
      rotation: cleaned.physical?.rotation?.length
        ? cleaned.physical.rotation
        : defaults.physical.rotation,
    },
  };
}

export function resolveActivePlan(
  pack: InstalledSeasonPack,
  weekIndex = 1,
  dayLabel = 'Day 1',
): ActivePlan {
  const config = resolvePlanConfig(pack);
  const week =
    config.weeklyThemes.find((w) => w.weekIndex === weekIndex) ?? config.weeklyThemes[0]!;

  return {
    programName: config.programName,
    seasonNumber: config.seasonNumber,
    seasonTitle: config.seasonTitle,
    durationWeeks: config.durationWeeks,
    seasonSummary: pack.data.season.summary,
    spiritual: {
      primaryGoal: config.primaryGoal,
      secondaryGoal: config.secondaryGoal,
      weeklyProgression: config.weeklyThemes,
    },
    physical: config.physical,
    hierarchy: {
      program: config.programName,
      season: `Season ${String(config.seasonNumber).padStart(2, '0')}: ${config.seasonTitle}`,
      weekLabel: `Week ${week.weekIndex}: ${week.theme}`,
      dayLabel,
    },
  };
}

export function buildDailyBrief(
  source: DailyBriefSource,
  plan: ActivePlan,
  sessionLabel: string,
): DailyBrief {
  const spiritual: string[] = [
    source.scriptureLabel,
    source.practicePrompt,
    'Complete morning checkpoint',
    'Reflect tonight',
  ];

  const physical: string[] = [];
  if (source.workoutTitle) {
    physical.push(source.workoutTitle);
    if (source.exerciseCount) physical.push(`${source.exerciseCount} exercises`);
    if (source.workoutSetCount) physical.push(`${source.workoutSetCount} working sets`);
  } else if (source.recoveryTitle) {
    physical.push('Recovery day');
    physical.push(source.recoveryTitle);
  } else {
    physical.push('Recovery day');
  }
  physical.push(`Protein target: ${plan.physical.foundations.proteinG}g`);
  physical.push(`Water target: ${plan.physical.foundations.waterOz} oz`);

  return {
    focus: titleCase(source.primaryFocus),
    hierarchyLine: [
      plan.hierarchy.program,
      plan.hierarchy.season,
      plan.hierarchy.weekLabel,
      `Day ${source.day.dayInWeek}: ${source.week.theme}`,
      `Session: ${sessionLabel}`,
    ].join(' · '),
    spiritual,
    physical,
  };
}
