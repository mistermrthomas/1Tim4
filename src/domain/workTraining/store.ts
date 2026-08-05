import { startOfWeekSunday } from '../calendar/week';
import { todayDateKey, newId } from '../physical/store';

export const WORK_TRAINING_KEY = 'path-work-training-v1';

export type WorkWeekLog = {
  id: string;
  weekStart: string;
  priorities: [string, string, string];
  leadershipPractice: string;
  bookInsight: string;
  fridayReflection: string;
  updatedAt: string;
};

type WorkState = {
  version: 1;
  weeks: WorkWeekLog[];
};

function empty(): WorkState {
  return { version: 1, weeks: [] };
}

export function readWorkTrainingState(): WorkState {
  try {
    const raw = localStorage.getItem(WORK_TRAINING_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as WorkState;
    if (parsed.version !== 1) return empty();
    return { version: 1, weeks: parsed.weeks ?? [] };
  } catch {
    return empty();
  }
}

function write(state: WorkState): void {
  localStorage.setItem(WORK_TRAINING_KEY, JSON.stringify(state));
}

export function weekStartFor(date = todayDateKey()): string {
  const [y, m, d] = date.split('-').map(Number);
  return startOfWeekSunday(new Date(y!, m! - 1, d!, 12));
}

export function getWorkWeek(weekStart = weekStartFor()): WorkWeekLog {
  const state = readWorkTrainingState();
  const found = state.weeks.find((w) => w.weekStart === weekStart);
  if (found) return found;
  return {
    id: newId('workw'),
    weekStart,
    priorities: ['', '', ''],
    leadershipPractice: '',
    bookInsight: '',
    fridayReflection: '',
    updatedAt: new Date().toISOString(),
  };
}

export function saveWorkWeek(week: WorkWeekLog): WorkWeekLog {
  const state = readWorkTrainingState();
  const saved = { ...week, updatedAt: new Date().toISOString() };
  const exists = state.weeks.some((w) => w.weekStart === week.weekStart);
  const weeks = exists
    ? state.weeks.map((w) => (w.weekStart === week.weekStart ? saved : w))
    : [saved, ...state.weeks];
  write({ version: 1, weeks });
  return saved;
}

export function recentWorkWeeks(limit = 8): WorkWeekLog[] {
  return readWorkTrainingState()
    .weeks.slice()
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, limit);
}
