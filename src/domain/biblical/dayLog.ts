import { notifyAccountBag } from '../../services/notifyAccountBag';
import { todayDateKey } from '../physical/store';

const KEY = 'path-biblical-day-v1';

export type ConcreteActionDisposition = 'unset' | 'completed' | 'not_completed' | 'carried_forward';

export interface BiblicalDayLog {
  dateKey: string;
  practiceAccepted: boolean;
  practiceDone: boolean;
  /** Honest outcome for today’s concrete action (required to close the day). */
  concreteActionStatus: ConcreteActionDisposition;
  concreteActionNote: string;
  expectedTest: string;
  intention: string;
  morningDone: boolean;
  middayDone: boolean;
  eveningDone: boolean;
  emotion: string | null;
  tested: 'yes' | 'not_yet' | 'unsure' | null;
  eveningNotes: Record<string, string>;
  scriptureReviewed: boolean;
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
    morningDone: false,
    middayDone: false,
    eveningDone: false,
    emotion: null,
    tested: null,
    eveningNotes: {},
    scriptureReviewed: false,
  };
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    dateKey,
    concreteActionStatus:
      stored.concreteActionStatus ?? (stored.practiceDone ? 'completed' : 'unset'),
    concreteActionNote: stored.concreteActionNote ?? '',
  };
}

export function saveBiblicalDay(log: BiblicalDayLog): void {
  const store = readStore();
  store[log.dateKey] = {
    ...log,
    concreteActionStatus: log.concreteActionStatus ?? 'unset',
    concreteActionNote: log.concreteActionNote ?? '',
  };
  writeStore(store);
}
