import { addDays } from '../calendar/week';
import { todayDateKey, newId } from '../physical/store';

export const MOBILITY_STORE_KEY = 'path-mobility-v1';

export type MobilityMove = {
  id: string;
  name: string;
  detail: string;
  /** Optional how-to image under /public */
  imageSrc?: string;
  /** Short coaching cues shown with the image. */
  cues?: string[];
};

export const MOBILITY_MOVES: MobilityMove[] = [
  {
    id: 'doorway_chest',
    name: 'Doorway Chest Stretch',
    detail: '30 seconds per side',
    imageSrc: '/assets/mobility/doorway-chest-stretch.png',
    cues: [
      'Stand in a doorway and place one forearm on the frame at about shoulder height.',
      'Keep the elbow bent near 90 degrees.',
      'Step the same-side foot forward and gently lean through the doorway until you feel a stretch across the chest and front of the shoulder.',
      'Breathe slowly. Switch sides after about 30 seconds.',
      'Stay mild — stop if shoulder pain increases.',
    ],
  },
  { id: 'overhead_lat', name: 'Overhead Lat Stretch', detail: '30 seconds per side' },
  { id: 'cross_body_shoulder', name: 'Cross-Body Shoulder Stretch', detail: '30 seconds per side' },
  { id: 'open_book', name: 'Open Book Rotation', detail: '8 reps per side' },
  { id: 'hip_flexor', name: 'Half-Kneeling Hip Flexor Stretch', detail: '30 seconds per side' },
  { id: 'hamstring', name: 'Hamstring Stretch', detail: '30 seconds per side' },
  { id: 'wall_calf', name: 'Wall Calf Stretch', detail: '30 seconds per side' },
];

export type MobilityEntry = {
  id: string;
  date: string;
  note: string;
  painNote: string;
  createdAt: string;
};

type MobilityState = {
  version: 1;
  entries: MobilityEntry[];
};

function empty(): MobilityState {
  return { version: 1, entries: [] };
}

export function readMobilityState(): MobilityState {
  try {
    const raw = localStorage.getItem(MOBILITY_STORE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as MobilityState;
    if (parsed.version !== 1) return empty();
    return { version: 1, entries: parsed.entries ?? [] };
  } catch {
    return empty();
  }
}

function write(state: MobilityState): void {
  localStorage.setItem(MOBILITY_STORE_KEY, JSON.stringify(state));
}

export function completeMobility(input: {
  date?: string;
  note?: string;
  painNote?: string;
}): MobilityEntry {
  const state = readMobilityState();
  const entry: MobilityEntry = {
    id: newId('mob'),
    date: input.date ?? todayDateKey(),
    note: (input.note ?? '').trim(),
    painNote: (input.painNote ?? '').trim(),
    createdAt: new Date().toISOString(),
  };
  write({ version: 1, entries: [entry, ...state.entries] });
  return entry;
}

export function mobilityCompletionsInLastDays(days = 7, today = todayDateKey()): number {
  const start = addDays(today, -(days - 1));
  return readMobilityState().entries.filter((e) => e.date >= start && e.date <= today).length;
}

export function latestMobility(): MobilityEntry | null {
  return readMobilityState().entries[0] ?? null;
}
