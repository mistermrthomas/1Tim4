import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectWorkoutExport,
  deliverWorkoutExport,
  WORKOUT_EXPORT_APP_VERSION,
} from './exportWorkouts';

function installStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  const setItem = vi.fn();
  const removeItem = vi.fn();
  const clear = vi.fn();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem,
      removeItem,
      clear,
      key: (index: number) => [...map.keys()][index] ?? null,
      get length() {
        return map.size;
      },
    },
  });
  return { map, setItem, removeItem, clear };
}

describe('collectWorkoutExport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bundles present workout keys as parsed JSON and leaves storage untouched', () => {
    const strength = { entries: [{ id: 'squat-1', weightLb: 155 }] };
    const tracker = { sessions: [{ id: 's1' }] };
    const walking = { entries: [{ date: '2026-09-01', minutes: 30 }] };
    const mobility = { entries: [{ date: '2026-09-02' }] };
    const body = { entries: [{ date: '2026-09-03', weightLb: 180 }] };
    const rotation = { lastCompletedIndex: 2 };
    const plan = { templates: [{ id: 'plan-a' }], schedule: [] };
    const completion = { '2026-09-01': { status: 'completed' } };
    const dayStatus = { '2026-09-01': 'completed' };
    const picks = { date: '2026-09-01', byWorkout: { a: ['chest'] } };

    const storage = installStorage({
      'path-strength-log-v1': JSON.stringify(strength),
      'path-physical-tracker-v1': JSON.stringify(tracker),
      'path-walking-v1': JSON.stringify(walking),
      'path-mobility-v1': JSON.stringify(mobility),
      'path-body-metrics-v1': JSON.stringify(body),
      'path-strength-rotation-v1': JSON.stringify(rotation),
      'path-physical-plan-v1': JSON.stringify(plan),
      'path-day-completion-v1': JSON.stringify(completion),
      'path-training-day-status-v1': JSON.stringify(dayStatus),
      'path-strength-group-picks-v1': JSON.stringify(picks),
      'path-theme': 'dark',
      'path-biblical-day-v1': JSON.stringify({ note: 'keep out' }),
      'path-app-data': JSON.stringify({ version: 1 }),
      'path-travel-v1': JSON.stringify({ trips: [1] }),
      'path-weekly-rhythm-v1': JSON.stringify({ weeks: 1 }),
      'path-work-training-v1': JSON.stringify({ weeks: [] }),
      'not-a-path-key': JSON.stringify({ strength: true }),
    });
    const before = JSON.stringify([...storage.map.entries()]);

    const file = collectWorkoutExport(new Date('2026-10-04T12:00:00.000Z'));

    expect(file.exportedAt).toBe('2026-10-04T12:00:00.000Z');
    expect(file.appVersion).toBe(WORKOUT_EXPORT_APP_VERSION);
    expect(file.keys['path-strength-log-v1']).toEqual(strength);
    expect(file.keys['path-physical-tracker-v1']).toEqual(tracker);
    expect(file.keys['path-walking-v1']).toEqual(walking);
    expect(file.keys['path-mobility-v1']).toEqual(mobility);
    expect(file.keys['path-body-metrics-v1']).toEqual(body);
    expect(file.keys['path-strength-rotation-v1']).toEqual(rotation);
    expect(file.keys['path-physical-plan-v1']).toEqual(plan);
    expect(file.keys['path-day-completion-v1']).toEqual(completion);
    expect(file.keys['path-training-day-status-v1']).toEqual(dayStatus);
    expect(file.keys['path-strength-group-picks-v1']).toEqual(picks);
    expect(file.keys).not.toHaveProperty('path-theme');
    expect(file.keys).not.toHaveProperty('path-biblical-day-v1');
    expect(file.keys).not.toHaveProperty('path-app-data');
    expect(file.keys).not.toHaveProperty('path-travel-v1');
    expect(file.keys).not.toHaveProperty('path-weekly-rhythm-v1');
    expect(file.keys).not.toHaveProperty('path-work-training-v1');
    expect(file.keys).not.toHaveProperty('not-a-path-key');
    expect(JSON.stringify([...storage.map.entries()])).toBe(before);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it('omits missing keys and keeps values that are not JSON', () => {
    installStorage({
      'path-strength-log-v1': 'not-json{',
      'path-walking-v1': JSON.stringify({ entries: [] }),
    });

    const file = collectWorkoutExport(new Date('2026-10-04T00:00:00.000Z'));

    expect(Object.keys(file.keys)).toEqual(['path-strength-log-v1', 'path-walking-v1']);
    expect(file.keys['path-strength-log-v1']).toBe('not-json{');
    expect(file.keys).not.toHaveProperty('path-mobility-v1');
  });
});

describe('deliverWorkoutExport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const file = {
    exportedAt: '2026-10-04T12:00:00.000Z',
    appVersion: '0.0.0',
    keys: { 'path-strength-log-v1': { entries: [{ id: '1' }] } },
  };

  it('shares a JSON file when the Web Share API accepts files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { share, canShare });

    await expect(deliverWorkoutExport(file)).resolves.toBe('shared');

    expect(canShare).toHaveBeenCalledOnce();
    const payload = share.mock.calls[0]?.[0] as ShareData;
    expect(payload.files).toHaveLength(1);
    const shared = payload.files?.[0];
    expect(shared).toBeInstanceOf(File);
    expect(shared?.name).toBe('path-workouts-2026-10-04.json');
    expect(shared?.type).toBe('application/json');
    expect(JSON.parse(await shared!.text())).toEqual(file);
  });

  it('does not download when the share sheet is dismissed', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    const click = vi.fn();
    vi.stubGlobal('navigator', { share, canShare: () => true });
    vi.stubGlobal('document', { createElement: () => ({ click }), body: { appendChild: vi.fn(), removeChild: vi.fn() } });

    await expect(deliverWorkoutExport(file)).resolves.toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
  });

  it('downloads a JSON file when file sharing is unavailable', async () => {
    const click = vi.fn();
    const anchor = { href: '', download: '', rel: '', click, remove: vi.fn() };
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => false });
    vi.stubGlobal('document', {
      createElement: () => anchor,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:workout', revokeObjectURL: vi.fn() });

    await expect(deliverWorkoutExport(file)).resolves.toBe('downloaded');
    expect(anchor.download).toBe('path-workouts-2026-10-04.json');
    expect(anchor.href).toBe('blob:workout');
    expect(click).toHaveBeenCalledOnce();
  });

  it('copies the JSON when sharing and download are unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('document', undefined);

    await expect(deliverWorkoutExport(file)).resolves.toBe('copied');
    expect(JSON.parse(writeText.mock.calls[0]?.[0] as string)).toEqual(file);
  });
});
