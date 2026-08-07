/**
 * Weekly formation plan persistence — IndexedDB entities store.
 * Falls back to memory when IndexedDB is unavailable (tests).
 */

import { createIndexedDbAdapter } from '../../data/storage/indexedDbAdapter';
import type { StorageAdapter } from '../../data/storage/StorageAdapter';
import type { DateKey } from '../calendar/week';
import type {
  ChurchNotesIndex,
  SermonAnalysis,
  SermonNote,
  WeeklyFormationPlan,
} from './types';

const INDEX_KEY = 'churchNotes:index';
const noteKey = (id: string) => `churchNotes:note:${id}`;
const analysisKey = (id: string) => `churchNotes:analysis:${id}`;
const planKey = (id: string) => `churchNotes:plan:${id}`;

let memory: {
  index: ChurchNotesIndex;
  notes: Map<string, SermonNote>;
  analyses: Map<string, SermonAnalysis>;
  plans: Map<string, WeeklyFormationPlan>;
} | null = null;
let adapterPromise: Promise<StorageAdapter | null> | null = null;

function emptyIndex(): ChurchNotesIndex {
  return { version: 1, noteIds: [], activeFormationPlanId: null };
}

async function getAdapter(): Promise<StorageAdapter | null> {
  if (typeof indexedDB === 'undefined') return null;
  adapterPromise ??= Promise.resolve()
    .then(() => createIndexedDbAdapter())
    .catch(() => null);
  return adapterPromise;
}

function mem() {
  memory ??= {
    index: emptyIndex(),
    notes: new Map(),
    analyses: new Map(),
    plans: new Map(),
  };
  return memory;
}

async function readIndex(): Promise<ChurchNotesIndex> {
  const adapter = await getAdapter();
  if (!adapter) return structuredClone(mem().index);
  return (await adapter.get<ChurchNotesIndex>('entities', INDEX_KEY)) ?? emptyIndex();
}

export async function listSermonNotes(): Promise<SermonNote[]> {
  const index = await readIndex();
  const adapter = await getAdapter();
  const notes: SermonNote[] = [];
  for (const id of index.noteIds) {
    const note = adapter
      ? await adapter.get<SermonNote>('entities', noteKey(id))
      : mem().notes.get(id);
    if (note) notes.push(note);
  }
  return notes.sort((a, b) => b.sermonDate.localeCompare(a.sermonDate));
}

export async function getSermonNote(id: string): Promise<SermonNote | null> {
  const adapter = await getAdapter();
  if (!adapter) return mem().notes.get(id) ?? null;
  return adapter.get<SermonNote>('entities', noteKey(id));
}

export async function saveSermonNote(note: SermonNote): Promise<SermonNote> {
  const next = { ...note, updatedAt: new Date().toISOString() };
  // Never allow callers to accidentally wipe rawNotes via undefined
  if (typeof next.rawNotes !== 'string') {
    throw new Error('rawNotes must remain a string');
  }
  const index = await readIndex();
  if (!index.noteIds.includes(next.id)) {
    index.noteIds = [next.id, ...index.noteIds];
  }
  const adapter = await getAdapter();
  if (!adapter) {
    mem().notes.set(next.id, structuredClone(next));
    mem().index = structuredClone(index);
    return next;
  }
  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', noteKey(next.id), next);
    await tx.put('entities', INDEX_KEY, index);
  });
  return next;
}

/**
 * Update sermon metadata without altering rawNotes unless explicitly passed
 * through `rawNotes` — AI flows must omit rawNotes to preserve originals.
 */
export async function updateSermonNoteMeta(
  id: string,
  patch: Partial<Omit<SermonNote, 'id' | 'userId' | 'createdAt' | 'rawNotes'>> & {
    rawNotes?: string;
  },
): Promise<SermonNote> {
  const existing = await getSermonNote(id);
  if (!existing) throw new Error('Sermon note not found');
  const { rawNotes: nextRaw, ...rest } = patch;
  const merged: SermonNote = {
    ...existing,
    ...rest,
    rawNotes: nextRaw !== undefined ? nextRaw : existing.rawNotes,
    id: existing.id,
    userId: existing.userId,
    createdAt: existing.createdAt,
  };
  return saveSermonNote(merged);
}

export async function getAnalysisForNote(sermonNoteId: string): Promise<SermonAnalysis | null> {
  const adapter = await getAdapter();
  if (!adapter) {
    for (const a of mem().analyses.values()) {
      if (a.sermonNoteId === sermonNoteId) return a;
    }
    return null;
  }
  // Scan via index of notes is enough for local volume; store analysis id on note would be nicer —
  // look up by listing known analyses through a secondary index key.
  const index = await readIndex();
  for (const noteId of index.noteIds) {
    if (noteId !== sermonNoteId) continue;
    // Try common analysis id pattern first, then scan entities is not available —
    // we store analysis under its own id; keep a pointer key.
    const pointer = await adapter.get<string>('entities', `churchNotes:analysisByNote:${sermonNoteId}`);
    if (pointer) {
      return adapter.get<SermonAnalysis>('entities', analysisKey(pointer));
    }
  }
  return null;
}

export async function saveSermonAnalysis(analysis: SermonAnalysis): Promise<SermonAnalysis> {
  const adapter = await getAdapter();
  const pointerKey = `churchNotes:analysisByNote:${analysis.sermonNoteId}`;
  if (!adapter) {
    mem().analyses.set(analysis.id, structuredClone(analysis));
    return analysis;
  }
  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', analysisKey(analysis.id), analysis);
    await tx.put('entities', pointerKey, analysis.id);
  });
  return analysis;
}

export async function getWeeklyFormationPlan(id: string): Promise<WeeklyFormationPlan | null> {
  const adapter = await getAdapter();
  if (!adapter) return mem().plans.get(id) ?? null;
  return adapter.get<WeeklyFormationPlan>('entities', planKey(id));
}

export async function getActiveFormationPlan(): Promise<WeeklyFormationPlan | null> {
  const index = await readIndex();
  if (!index.activeFormationPlanId) return null;
  return getWeeklyFormationPlan(index.activeFormationPlanId);
}

export async function getActiveFormationPlanForDate(
  dateKey: DateKey,
): Promise<WeeklyFormationPlan | null> {
  const active = await getActiveFormationPlan();
  if (!active || !active.active) return null;
  if (dateKey < active.startDate || dateKey > active.endDate) return null;
  return active;
}

export async function saveWeeklyFormationPlan(
  plan: WeeklyFormationPlan,
): Promise<WeeklyFormationPlan> {
  const next = { ...plan, updatedAt: new Date().toISOString() };
  const index = await readIndex();
  if (!index.formationPlanIds) index.formationPlanIds = [];
  if (!index.formationPlanIds.includes(next.id)) {
    index.formationPlanIds = [next.id, ...index.formationPlanIds];
  }
  if (next.active) {
    // Deactivate previous active plan in memory/IDB
    if (index.activeFormationPlanId && index.activeFormationPlanId !== next.id) {
      const prev = await getWeeklyFormationPlan(index.activeFormationPlanId);
      if (prev?.active) {
        const deactivated = { ...prev, active: false, updatedAt: new Date().toISOString() };
        const adapter = await getAdapter();
        if (!adapter) {
          mem().plans.set(deactivated.id, structuredClone(deactivated));
        } else {
          await adapter.put('entities', planKey(deactivated.id), deactivated);
        }
      }
    }
    index.activeFormationPlanId = next.id;
  }
  const adapter = await getAdapter();
  if (!adapter) {
    mem().plans.set(next.id, structuredClone(next));
    mem().index = structuredClone(index);
    return next;
  }
  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', planKey(next.id), next);
    await tx.put('entities', INDEX_KEY, index);
  });
  return next;
}

export interface ChurchNotesSnapshot {
  index: ChurchNotesIndex;
  notes: SermonNote[];
  analyses: SermonAnalysis[];
  plans: WeeklyFormationPlan[];
}

export async function exportChurchNotesSnapshot(): Promise<ChurchNotesSnapshot> {
  const index = await readIndex();
  const notes = await listSermonNotes();
  const analyses: SermonAnalysis[] = [];
  for (const note of notes) {
    const analysis = await getAnalysisForNote(note.id);
    if (analysis) analyses.push(analysis);
  }
  const plans: WeeklyFormationPlan[] = [];
  const planIds = new Set(index.formationPlanIds ?? []);
  if (index.activeFormationPlanId) planIds.add(index.activeFormationPlanId);
  for (const id of planIds) {
    const plan = await getWeeklyFormationPlan(id);
    if (plan) plans.push(plan);
  }
  return {
    index: structuredClone(index),
    notes: structuredClone(notes),
    analyses: structuredClone(analyses),
    plans: structuredClone(plans),
  };
}

export async function importChurchNotesSnapshot(snapshot: ChurchNotesSnapshot): Promise<void> {
  const index = structuredClone(snapshot.index);
  const adapter = await getAdapter();
  if (!adapter) {
    mem().index = structuredClone(index);
    mem().notes = new Map(snapshot.notes.map((n) => [n.id, structuredClone(n)]));
    mem().analyses = new Map(snapshot.analyses.map((a) => [a.id, structuredClone(a)]));
    mem().plans = new Map(snapshot.plans.map((p) => [p.id, structuredClone(p)]));
    return;
  }
  await adapter.tx(['entities'], 'rw', async (tx) => {
    await tx.put('entities', INDEX_KEY, index);
    for (const note of snapshot.notes) {
      await tx.put('entities', noteKey(note.id), note);
    }
    for (const analysis of snapshot.analyses) {
      await tx.put('entities', analysisKey(analysis.id), analysis);
      await tx.put('entities', `churchNotes:analysisByNote:${analysis.sermonNoteId}`, analysis.id);
    }
    for (const plan of snapshot.plans) {
      await tx.put('entities', planKey(plan.id), plan);
    }
  });
}

export function __resetChurchNotesMemoryForTests(): void {
  memory = {
    index: emptyIndex(),
    notes: new Map(),
    analyses: new Map(),
    plans: new Map(),
  };
  adapterPromise = null;
}
