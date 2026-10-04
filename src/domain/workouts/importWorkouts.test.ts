import { afterEach, describe, expect, it } from 'vitest';
import { collectWorkoutExport, isWorkoutExportKey, serializeWorkoutExport } from './exportWorkouts';
import {
  applyWorkoutImport,
  encodeStoredValue,
  hasWorkoutImportBackup,
  parseWorkoutExport,
  restoreWorkoutImportBackup,
  summarizeWorkoutImport,
  WORKOUT_IMPORT_BACKUP_KEY,
} from './importWorkouts';

function installStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
      setItem: (key: string, value: string) => {
        map.set(key, String(value));
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => {
        map.clear();
      },
      key: (index: number) => [...map.keys()][index] ?? null,
      get length() {
        return map.size;
      },
    },
  });
  return map;
}

function snapshot(map: Map<string, string>): Record<string, string> {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

const exportedAt = '2026-10-04T12:00:00.000Z';

function sampleOriginals(): Record<string, string> {
  return {
    'path-strength-log-v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'squat-1', weightLb: 155, note: 'a "quote" and emoji' },
        { id: 'press-1', weightLb: 95 },
      ],
      workoutNotes: [{ id: 'n1' }],
    }),
    'path-physical-tracker-v1': JSON.stringify({
      version: 1,
      sessions: [{ id: 's1' }],
      intake: [],
      steps: [{ date: '2026-09-01' }],
    }),
    'path-walking-v1': JSON.stringify({
      version: 1,
      entries: [{ date: '2026-09-01', minutes: 30 }],
    }),
    'path-mobility-v1': JSON.stringify({
      version: 1,
      entries: [{ date: '2026-09-02' }, { date: '2026-09-03' }],
    }),
    'path-body-metrics-v1': JSON.stringify({
      version: 1,
      entries: [{ date: '2026-09-03', weightLb: 180 }],
    }),
    'path-strength-rotation-v1': JSON.stringify({ lastCompletedIndex: 2 }),
    'path-physical-plan-v1': JSON.stringify({ templates: [{ id: 'plan-a' }], schedule: [] }),
    'path-day-completion-v1': JSON.stringify({ '2026-09-01': { status: 'completed' } }),
    'path-training-day-status-v1': JSON.stringify({ '2026-09-01': 'completed' }),
    'path-strength-group-picks-v1': JSON.stringify({
      date: '2026-09-01',
      byWorkout: { a: ['chest'] },
    }),
    'path-strength-log-v1-raw': 'not-json{',
  };
}

describe('import workouts', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('restores identical localStorage values from an export file', () => {
    const originals = sampleOriginals();
    const unrelated = {
      'path-theme': 'dark',
      'path-biblical-day-v1': JSON.stringify({ note: 'keep out' }),
      'path-app-data': JSON.stringify({ version: 1 }),
    };
    const map = installStorage({ ...originals, ...unrelated });
    const exported = collectWorkoutExport(new Date(exportedAt));
    const json = serializeWorkoutExport(exported);

    map.clear();
    map.set('path-theme', 'light');
    map.set('path-strength-log-v1', JSON.stringify({ version: 1, entries: [] }));
    map.set('path-walking-v1', JSON.stringify({ version: 1, entries: [{ date: '1999-01-01' }] }));

    const file = parseWorkoutExport(json);
    applyWorkoutImport(file, new Date('2026-10-04T13:00:00.000Z'));

    for (const [key, value] of Object.entries(originals)) {
      expect(map.get(key)).toBe(value);
    }
    expect(map.get('path-theme')).toBe('light');
    expect(map.has('path-biblical-day-v1')).toBe(false);
    expect(collectWorkoutExport(new Date(exportedAt)).keys).toEqual(exported.keys);
    expect(hasWorkoutImportBackup()).toBe(true);

    const backup = JSON.parse(map.get(WORKOUT_IMPORT_BACKUP_KEY) ?? '') as {
      entries: Record<string, string | null>;
    };
    expect(backup.entries['path-strength-log-v1']).toBe(JSON.stringify({ version: 1, entries: [] }));
    expect(backup.entries['path-walking-v1']).toBe(
      JSON.stringify({ version: 1, entries: [{ date: '1999-01-01' }] }),
    );
    expect(backup.entries['path-mobility-v1']).toBeNull();
    expect(backup.entries).not.toHaveProperty('path-theme');
  });

  it('undo puts back the values from before the import', () => {
    const originals = sampleOriginals();
    const map = installStorage(originals);
    const json = serializeWorkoutExport(collectWorkoutExport(new Date(exportedAt)));

    map.clear();
    map.set('path-theme', 'dark');
    map.set('path-walking-v1', JSON.stringify({ version: 1, entries: [] }));
    const beforeImport = snapshot(map);

    applyWorkoutImport(parseWorkoutExport(json));
    expect(map.get('path-strength-log-v1')).toBe(originals['path-strength-log-v1']);

    restoreWorkoutImportBackup();
    expect(snapshot(map)).toEqual(beforeImport);
    expect(hasWorkoutImportBackup()).toBe(false);
  });

  it('leaves storage untouched when the file is malformed or not workout data', () => {
    const map = installStorage({
      'path-strength-log-v1': JSON.stringify({ entries: [{ id: 'keep' }] }),
      'path-theme': 'dark',
    });
    const before = snapshot(map);
    const bad = [
      '{',
      'null',
      '[]',
      JSON.stringify({ hello: 1 }),
      JSON.stringify({
        exportedAt,
        appVersion: '0.0.0',
        keys: { 'path-theme': 'dark' },
      }),
      JSON.stringify({
        exportedAt,
        appVersion: '0.0.0',
        keys: { 'path-biblical-day-v1': { note: 'no' } },
      }),
      JSON.stringify({
        exportedAt,
        appVersion: '0.0.0',
        keys: [],
      }),
      JSON.stringify({
        exportedAt: 'yesterday',
        appVersion: '0.0.0',
        keys: {},
      }),
    ];

    for (const text of bad) {
      expect(() => parseWorkoutExport(text)).toThrow(/Nothing was changed/);
    }
    expect(() =>
      applyWorkoutImport({
        exportedAt,
        appVersion: '0.0.0',
        keys: { 'path-theme': 'dark' },
      }),
    ).toThrow(/Nothing was changed/);
    expect(snapshot(map)).toEqual(before);
    expect(hasWorkoutImportBackup()).toBe(false);
  });

  it('does not wipe existing bags when the export is empty', () => {
    const map = installStorage({
      'path-strength-log-v1': JSON.stringify({ entries: [{ id: 'keep' }] }),
      'path-walking-v1': JSON.stringify({ entries: [{ date: '2026-09-01' }] }),
    });
    const before = snapshot(map);
    const file = parseWorkoutExport(
      JSON.stringify({ exportedAt, appVersion: '0.0.0', keys: {} }),
    );

    applyWorkoutImport(file);

    expect(snapshot(map)).toEqual(before);
    expect(hasWorkoutImportBackup()).toBe(false);
  });

  it('summarizes counts per bag before anything is written', () => {
    const map = installStorage({
      'path-strength-log-v1': JSON.stringify({ entries: [{ id: 'keep' }] }),
    });
    const before = snapshot(map);
    const file = parseWorkoutExport(
      JSON.stringify({
        exportedAt,
        appVersion: '0.0.0',
        keys: {
          'path-strength-log-v1': { entries: [{ id: '1' }, { id: '2' }], workoutNotes: [] },
          'path-walking-v1': { version: 1, entries: [{ date: '2026-09-01' }] },
          'path-mobility-v1': { entries: [] },
          'path-physical-tracker-v1': { sessions: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] },
          'path-day-completion-v1': { '2026-09-01': { status: 'completed' } },
        },
      }),
    );

    const summary = summarizeWorkoutImport(file);

    expect(summary.replacedKeyCount).toBe(5);
    expect(summary.bags.map((bag) => [bag.label, bag.detail])).toEqual([
      ['Strength', '2 entries'],
      ['Walking', '1 entry'],
      ['Mobility', '0 entries'],
      ['Body', 'Not in this file — left as it is'],
      ['Sessions', '3 sessions'],
      ['Completed days', '1 day'],
    ]);
    expect(snapshot(map)).toEqual(before);
  });

  it('keeps a non-JSON stored string identical', () => {
    installStorage({ 'path-strength-log-v1': 'not-json{' });
    const json = serializeWorkoutExport(collectWorkoutExport(new Date(exportedAt)));
    const map = installStorage({ 'path-strength-log-v1': '{"entries":[1]}' });

    applyWorkoutImport(parseWorkoutExport(json));

    expect(map.get('path-strength-log-v1')).toBe('not-json{');
    expect(encodeStoredValue('not-json{')).toBe('not-json{');
  });

  it('does not treat the undo snapshot as workout data', () => {
    expect(isWorkoutExportKey(WORKOUT_IMPORT_BACKUP_KEY)).toBe(false);
  });
});
