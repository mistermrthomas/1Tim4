import type { MorningMode } from '../../domain/formation/types';
import type { DailyContentSnapshot, InstalledContentPack } from '../types';

export interface ResolveDailySnapshotInput {
  pack: InstalledContentPack;
  focusKey: string;
  stageKey: string;
  morningMode: MorningMode;
  workoutTemplateId: string;
  source?: DailyContentSnapshot['meta']['source'];
}

export function resolveDailySnapshot(input: ResolveDailySnapshotInput): DailyContentSnapshot {
  const { pack, focusKey, stageKey, morningMode, workoutTemplateId } = input;
  const focus = pack.data.foci.find((f) => f.id === focusKey);
  if (!focus) throw new Error(`Unknown focusKey: ${focusKey}`);

  const teaching =
    pack.data.teachings.find((t) => t.lens === 'jesus_primary') ?? pack.data.teachings[0];
  if (!teaching) throw new Error('Foundation pack missing teachings');

  const assignment =
    pack.data.assignments.find(
      (a) => a.focusKey === focusKey && (a.stageKeys.includes(stageKey) || a.stageKeys.includes('*')),
    ) ?? pack.data.assignments.find((a) => a.focusKey === focusKey);

  if (!assignment) throw new Error(`No assignment for focus ${focusKey}`);

  const template = pack.data.workouts.templates.find((t) => t.id === workoutTemplateId);
  if (!template) throw new Error(`Unknown workout template: ${workoutTemplateId}`);
  const session = template.sessions[0];
  if (!session) throw new Error(`Template ${workoutTemplateId} has no sessions`);

  const promptIds = pack.data.prompts
    .filter((p) => p.focusKeys.includes('*') || p.focusKeys.includes(focusKey))
    .map((p) => p.id);

  return {
    packId: pack.manifest.packId,
    packVersion: pack.manifest.version,
    focusKey,
    stageKey,
    morningMode,
    teachingId: teaching.id,
    referenceId: teaching.primaryReferenceId,
    assignmentId: assignment.id,
    workoutTemplateId: template.id,
    workoutSessionId: session.id,
    promptIds,
    meta: {
      source: input.source ?? 'bundled',
      resolvedAt: new Date().toISOString(),
    },
  };
}
