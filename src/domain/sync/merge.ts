export interface WorkoutLogMergeInput {
  local: { revision: number; painFlag: boolean; status: string; performed?: unknown };
  remote: { revision: number; painFlag: boolean; status: string; performed?: unknown };
}

export interface WorkoutLogMergeResult {
  revision: number;
  painFlag: boolean;
  status: string;
  performed?: unknown;
  source: 'local' | 'remote' | 'merged';
}

/** Pain flag uses OR semantics — true never silently regresses. */
export function mergeWorkoutLogs(input: WorkoutLogMergeInput): WorkoutLogMergeResult {
  const painFlag = input.local.painFlag || input.remote.painFlag;
  if (input.local.revision > input.remote.revision) {
    return {
      revision: input.local.revision,
      painFlag,
      status: input.local.status,
      performed: input.local.performed,
      source: input.remote.painFlag && !input.local.painFlag ? 'merged' : 'local',
    };
  }
  if (input.remote.revision > input.local.revision) {
    return {
      revision: input.remote.revision,
      painFlag,
      status: input.remote.status,
      performed: input.remote.performed,
      source: input.local.painFlag && !input.remote.painFlag ? 'merged' : 'remote',
    };
  }
  return {
    revision: input.local.revision,
    painFlag,
    status: input.local.status,
    performed: input.local.performed ?? input.remote.performed,
    source: 'merged',
  };
}

export interface CheckInResponse {
  promptId: string;
  promptText: string;
  answer: string;
}

/** Merge completed check-in responses by prompt id; prefer non-empty; tie → higher revision side. */
export function mergeCheckInResponses(
  local: { revision: number; responses: CheckInResponse[] },
  remote: { revision: number; responses: CheckInResponse[] },
): CheckInResponse[] {
  const map = new Map<string, CheckInResponse>();
  const preferLocal = local.revision >= remote.revision;

  const apply = (list: CheckInResponse[], isPreferred: boolean) => {
    for (const r of list) {
      const existing = map.get(r.promptId);
      if (!existing) {
        map.set(r.promptId, r);
        continue;
      }
      const existingEmpty = !existing.answer.trim();
      const incomingEmpty = !r.answer.trim();
      if (existingEmpty && !incomingEmpty) {
        map.set(r.promptId, r);
      } else if (!existingEmpty && incomingEmpty) {
        // keep existing
      } else if (isPreferred) {
        map.set(r.promptId, r);
      }
    }
  };

  if (preferLocal) {
    apply(remote.responses, false);
    apply(local.responses, true);
  } else {
    apply(local.responses, false);
    apply(remote.responses, true);
  }

  return [...map.values()];
}

export interface CloudLinkDecision {
  action: 'upload_local' | 'download_cloud' | 'merge';
}

export function decideCloudLinkMerge(input: {
  localMeaningful: boolean;
  cloudMeaningful: boolean;
}): CloudLinkDecision {
  if (input.localMeaningful && !input.cloudMeaningful) return { action: 'upload_local' };
  if (!input.localMeaningful && input.cloudMeaningful) return { action: 'download_cloud' };
  return { action: 'merge' };
}
