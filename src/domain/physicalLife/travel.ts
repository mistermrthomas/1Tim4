import { todayDateKey } from '../physical/store';

export const TRAVEL_STORE_KEY = 'path-travel-v1';

export type TravelDayKind = 'travel' | 'hotel_strength' | 'walk' | 'mobility' | 'rest';

export type TravelTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  /** Per-date overrides inside the trip window. */
  dayKinds: Record<string, TravelDayKind>;
};

type TravelState = {
  version: 1;
  trips: TravelTrip[];
};

const POLAND_TRIP: TravelTrip = {
  id: 'travel_poland_2026',
  name: 'Poland trip',
  startDate: '2026-08-16',
  endDate: '2026-08-21',
  notes:
    'Hotel gym may be limited. Late work hours possible. Prefer maintenance over progression. Aug 16 and Aug 21 are travel days.',
  dayKinds: {
    '2026-08-16': 'travel',
    '2026-08-17': 'hotel_strength',
    '2026-08-18': 'walk',
    '2026-08-19': 'hotel_strength',
    '2026-08-20': 'mobility',
    '2026-08-21': 'rest',
  },
};

function empty(): TravelState {
  return { version: 1, trips: [POLAND_TRIP] };
}

export function readTravelState(): TravelState {
  try {
    const raw = localStorage.getItem(TRAVEL_STORE_KEY);
    if (!raw) {
      const seeded = empty();
      localStorage.setItem(TRAVEL_STORE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as TravelState;
    if (parsed.version !== 1) return empty();
    const trips = parsed.trips?.length ? parsed.trips : [POLAND_TRIP];
    if (!trips.some((t) => t.id === POLAND_TRIP.id)) {
      trips.unshift(POLAND_TRIP);
    }
    return { version: 1, trips };
  } catch {
    return empty();
  }
}

function write(state: TravelState): void {
  localStorage.setItem(TRAVEL_STORE_KEY, JSON.stringify(state));
}

export function activeTrip(date = todayDateKey()): TravelTrip | null {
  return (
    readTravelState().trips.find((trip) => date >= trip.startDate && date <= trip.endDate) ?? null
  );
}

export function isTravelDay(date = todayDateKey()): boolean {
  return Boolean(activeTrip(date));
}

export function travelRecommendation(date = todayDateKey()): {
  trip: TravelTrip | null;
  kind: TravelDayKind | null;
  label: string;
  guidance: string;
} {
  const trip = activeTrip(date);
  if (!trip) {
    return {
      trip: null,
      kind: null,
      label: 'Home training',
      guidance: 'Follow the normal strength rotation.',
    };
  }
  const kind = trip.dayKinds[date] ?? 'hotel_strength';
  const labels: Record<TravelDayKind, string> = {
    travel: 'Travel day',
    hotel_strength: 'Hotel strength',
    walk: '20–40 minute walk',
    mobility: 'Mobility only',
    rest: 'Rest',
  };
  return {
    trip,
    kind,
    label: labels[kind],
    guidance:
      'Travel mode preserves your workout rotation. Prefer maintenance over progression. Resume the next rotation slot when you return.',
  };
}

export function setTravelDayKind(
  tripId: string,
  date: string,
  kind: TravelDayKind,
): TravelState {
  const state = readTravelState();
  const next = {
    ...state,
    trips: state.trips.map((trip) =>
      trip.id === tripId
        ? { ...trip, dayKinds: { ...trip.dayKinds, [date]: kind } }
        : trip,
    ),
  };
  write(next);
  return next;
}
