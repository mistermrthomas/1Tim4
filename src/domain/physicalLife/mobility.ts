import { addDays } from '../calendar/week';
import { todayDateKey, newId } from '../physical/store';

import { notifyAccountBag } from '../../services/notifyAccountBag';

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
  {
    id: 'overhead_lat',
    name: 'Overhead Lat Stretch',
    detail: '30 seconds per side',
    imageSrc: '/assets/mobility/overhead-lat-stretch.png',
    cues: [
      'Stand beside a doorway or upright support.',
      'Reach one arm overhead and hold the frame.',
      'Gently lean away until you feel a stretch along the side of the torso and lat.',
      'Keep ribs stacked — avoid collapsing into the low back.',
      'Breathe slowly. Switch sides after about 30 seconds.',
    ],
  },
  {
    id: 'cross_body_shoulder',
    name: 'Cross-Body Shoulder Stretch',
    detail: '30 seconds per side',
    imageSrc: '/assets/mobility/cross-body-shoulder-stretch.png',
    cues: [
      'Stand tall with shoulders relaxed.',
      'Bring one arm across the chest.',
      'Use the opposite hand to gently pull the upper arm closer.',
      'Keep the elbow soft — do not yank on the joint.',
      'Hold about 30 seconds, then switch sides. Stop if shoulder pain increases.',
    ],
  },
  {
    id: 'open_book',
    name: 'Open Book Rotation',
    detail: '8 reps per side',
    imageSrc: '/assets/mobility/open-book-rotation.png',
    cues: [
      'Lie on your side with knees bent and stacked.',
      'Extend the bottom arm forward on the floor for support.',
      'Reach the top arm up and open backward toward the floor, like opening a book.',
      'Follow the hand with your eyes; keep knees stacked.',
      'Return slowly. Do about 8 controlled reps, then switch sides.',
    ],
  },
  {
    id: 'hip_flexor',
    name: 'Half-Kneeling Hip Flexor Stretch',
    detail: '30 seconds per side',
    imageSrc: '/assets/mobility/half-kneeling-hip-flexor.png',
    cues: [
      'Kneel with one knee down and the other foot forward (half-kneeling).',
      'Keep the torso tall — squeeze the glute on the back leg.',
      'Gently shift hips forward until you feel a stretch in the front of the back hip.',
      'Avoid arching hard through the low back.',
      'Hold about 30 seconds, then switch sides.',
    ],
  },
  {
    id: 'hamstring',
    name: 'Hamstring Stretch',
    detail: '30 seconds per side',
    imageSrc: '/assets/mobility/hamstring-stretch.png',
    cues: [
      'Place one heel on a low step or sturdy chair.',
      'Keep that knee mostly straight but soft.',
      'Hinge at the hips with a long spine — lean from the hips, not a rounded back.',
      'Stop when you feel a gentle stretch behind the thigh.',
      'Hold about 30 seconds, then switch sides.',
    ],
  },
  {
    id: 'wall_calf',
    name: 'Wall Calf Stretch',
    detail: '30 seconds per side',
    imageSrc: '/assets/mobility/wall-calf-stretch.png',
    cues: [
      'Face a wall with hands at about shoulder height.',
      'Step one foot back; keep the back heel down and knee straight.',
      'Bend the front knee and lean in until you feel a stretch in the back calf.',
      'Keep toes pointed forward.',
      'Hold about 30 seconds, then switch sides.',
    ],
  },
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
  notifyAccountBag('mobility');
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

export function mobilityDoneOn(date = todayDateKey()): boolean {
  return readMobilityState().entries.some((e) => e.date === date);
}

export function clearMobilityOn(date = todayDateKey()): void {
  const state = readMobilityState();
  write({ version: 1, entries: state.entries.filter((e) => e.date !== date) });
}

export function mobilityCompletionsInLastDays(days = 7, today = todayDateKey()): number {
  const start = addDays(today, -(days - 1));
  return readMobilityState().entries.filter((e) => e.date >= start && e.date <= today).length;
}

export function latestMobility(): MobilityEntry | null {
  return readMobilityState().entries[0] ?? null;
}
