import { todayDateKey } from '../physical/store';

const KEY = 'path-biblical-day-v1';

export interface BiblicalDayLog {
  dateKey: string;
  practiceAccepted: boolean;
  practiceDone: boolean;
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
}

export function loadBiblicalDay(dateKey = todayDateKey()): BiblicalDayLog {
  return (
    readStore()[dateKey] ?? {
      dateKey,
      practiceAccepted: false,
      practiceDone: false,
      expectedTest: '',
      intention: '',
      morningDone: false,
      middayDone: false,
      eveningDone: false,
      emotion: null,
      tested: null,
      eveningNotes: {},
      scriptureReviewed: false,
    }
  );
}

export function saveBiblicalDay(log: BiblicalDayLog): void {
  const store = readStore();
  store[log.dateKey] = log;
  writeStore(store);
}
