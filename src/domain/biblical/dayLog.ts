import { notifyAccountBag } from '../../services/notifyAccountBag';
import type { MorningMode } from '../formation/types';
import { todayDateKey } from '../physical/store';

const KEY = 'path-biblical-day-v1';
const MODE_KEY = 'path-morning-mode-v1';

export type ConcreteActionDisposition = 'unset' | 'completed' | 'not_completed' | 'carried_forward';

export interface BiblicalDayLog {
  dateKey: string;
  practiceAccepted: boolean;
  practiceDone: boolean;
  concreteActionStatus: ConcreteActionDisposition;
  concreteActionNote: string;
  expectedTest: string;
  intention: string;
  prayerText: string;
  /** Observe: what stood out in the reading. */
  morningReflection: string;
  /** AI follow-up question (one). */
  reflectQuestion: string;
  /** Answer to the AI follow-up. */
  reflectAnswer: string;
  morningMode: MorningMode;
  morningDone: boolean;
  middayDone: boolean;
  eveningDone: boolean;
  emotion: string | null;
  tested: 'yes' | 'not_yet' | 'unsure' | null;
  eveningNotes: Record<string, string>;
  scriptureReviewed: boolean;
  updatedAt: string;
}

type Store = Record<string, BiblicalDayLog>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
  notifyAccountBag('biblical_day');
}

function defaultMode(): MorningMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === 'full' || raw === 'short' || raw === 'two_minute') return raw;
  } catch {
    /* ignore */
  }
  return 'full';
}

export function persistMorningModePreference(mode: MorningMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function loadBiblicalDay(dateKey = todayDateKey()): BiblicalDayLog {
  const stored = readStore()[dateKey];
  const defaults: BiblicalDayLog = {
    dateKey,
    practiceAccepted: false,
    practiceDone: false,
    concreteActionStatus: 'unset',
    concreteActionNote: '',
    expectedTest: '',
    intention: '',
    prayerText: '',
    morningReflection: '',
    reflectQuestion: '',
    reflectAnswer: '',
    morningMode: defaultMode(),
    morningDone: false,
    middayDone: false,
    eveningDone: false,
    emotion: null,
    tested: null,
    eveningNotes: {},
    scriptureReviewed: false,
    updatedAt: new Date().toISOString(),
  };
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    dateKey,
    concreteActionStatus:
      stored.concreteActionStatus ?? (stored.practiceDone ? 'completed' : 'unset'),
    concreteActionNote: stored.concreteActionNote ?? '',
    prayerText: stored.prayerText ?? stored.intention ?? '',
    morningReflection: stored.morningReflection ?? '',
    reflectQuestion: stored.reflectQuestion ?? '',
    reflectAnswer: stored.reflectAnswer ?? '',
    morningMode:
      stored.morningMode === 'short' || stored.morningMode === 'two_minute'
        ? stored.morningMode
        : stored.morningMode === 'full'
          ? 'full'
          : defaultMode(),
    eveningNotes: stored.eveningNotes ?? {},
    updatedAt: stored.updatedAt ?? defaults.updatedAt,
  };
}

export function saveBiblicalDay(log: BiblicalDayLog): void {
  const store = readStore();
  store[log.dateKey] = {
    ...log,
    concreteActionStatus: log.concreteActionStatus ?? 'unset',
    concreteActionNote: log.concreteActionNote ?? '',
    prayerText: log.prayerText ?? '',
    morningReflection: log.morningReflection ?? '',
    reflectQuestion: log.reflectQuestion ?? '',
    reflectAnswer: log.reflectAnswer ?? '',
    eveningNotes: log.eveningNotes ?? {},
    updatedAt: new Date().toISOString(),
  };
  if (log.morningMode) persistMorningModePreference(log.morningMode);
  writeStore(store);
}

/** Prior journal snippets from other days (newest first) for AI context. */
export function listPriorJournalSnippets(excludeDateKey: string, limit = 5): string {
  const store = readStore();
  const rows = Object.values(store)
    .filter((d) => d.dateKey !== excludeDateKey)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, limit);

  const parts: string[] = [];
  for (const d of rows) {
    if (d.morningReflection.trim()) {
      parts.push(`${d.dateKey} observe: ${d.morningReflection.trim()}`);
    }
    if (d.reflectAnswer.trim()) {
      parts.push(`${d.dateKey} reflect: ${d.reflectAnswer.trim()}`);
    }
  }
  return parts.join('\n').slice(0, 3_000);
}
