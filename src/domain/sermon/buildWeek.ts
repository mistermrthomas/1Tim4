import type { SermonPlan } from '../../../shared/sermonPlanSchema';
import { applySermonPlanToWeeklyPlan } from '../aiPlanning/applySermonPlan';
import {
  notesAreMeaningful,
  requestSermonPlan,
  SermonPlanClientError,
} from '../aiPlanning/client';
import {
  DEFAULT_PLANNING_PROMPT,
  DEFAULT_PLANNING_PROMPT_VERSION,
  readAiPlanningSettings,
} from '../aiPlanning/settings';
import type { DateKey } from '../calendar/week';
import { nextSundayStart, startOfWeekSunday } from '../calendar/week';
import { activateWeeklyPlan, ensureWeeklyPlan, listWeeklyPlans, saveWeeklyPlan } from '../weeklyPlan/store';
import type { WeeklyPlan } from '../weeklyPlan/types';
import { biblicalWeekFromPlan, sermonRecordFromPlan } from './fromWeeklyPlan';
import type { BiblicalWeekRecord, SermonRecord } from './types';

export type SermonFormInput = {
  sermonDate: DateKey;
  title: string;
  notes: string;
  primaryScripture: string;
  speaker: string;
  church: string;
  sermonLink: string;
};

export type BuildWeekResult =
  | { ok: true; sermon: SermonRecord; week: BiblicalWeekRecord; plan: WeeklyPlan }
  | { ok: false; sermonSaved: true; sermon: SermonRecord; plan: WeeklyPlan; error: string }
  | { ok: false; sermonSaved: false; error: string };

/** Most recent Sunday on or before today (local). */
export function mostRecentSunday(today = new Date()): DateKey {
  return startOfWeekSunday(today);
}

/** Week start used for the upcoming biblical training week. */
export function sermonWeekStart(today = new Date()): DateKey {
  return nextSundayStart(today);
}

/** Reuse speaker / church from the latest prior sermon entry. */
export async function lastSermonDefaults(): Promise<{ speaker: string; church: string }> {
  const plans = await listWeeklyPlans();
  for (const plan of plans) {
    const speaker = plan.church.speaker.trim();
    const church = plan.church.churchName.trim();
    if (speaker || church) return { speaker, church };
  }
  return { speaker: '', church: '' };
}

export async function saveSermonNotes(input: SermonFormInput): Promise<WeeklyPlan> {
  const weekStart = startOfWeekSunday(new Date(`${input.sermonDate}T12:00:00`));
  const plan = await ensureWeeklyPlan(weekStart);
  return saveWeeklyPlan({
    ...plan,
    church: {
      ...plan.church,
      sermonDate: input.sermonDate,
      sermonTitle: input.title.trim(),
      sermonNotes: input.notes,
      primaryScripture: input.primaryScripture.trim(),
      speaker: input.speaker.trim(),
      churchName: input.church.trim(),
      sermonUrl: input.sermonLink.trim(),
    },
  });
}

/**
 * Activate biblical week without syncing / overwriting the physical schedule.
 * Physical and work systems stay independent of the sermon.
 */
export async function activateBiblicalWeek(planId: string): Promise<WeeklyPlan> {
  return activateWeeklyPlan(planId);
}

/**
 * Save sermon notes, generate biblical training, activate the week.
 * On AI failure, notes remain saved and no blank week is activated.
 */
export async function buildWeekFromSermon(input: SermonFormInput): Promise<BuildWeekResult> {
  if (!notesAreMeaningful(input.notes)) {
    return {
      ok: false,
      sermonSaved: false,
      error: 'Add a few sentences of sermon notes before building this week’s training.',
    };
  }

  let persisted: WeeklyPlan;
  try {
    persisted = await saveSermonNotes(input);
  } catch (e) {
    return {
      ok: false,
      sermonSaved: false,
      error: e instanceof Error ? e.message : 'Could not save sermon notes.',
    };
  }

  const sermon = sermonRecordFromPlan(persisted);

  try {
    const settings = await readAiPlanningSettings();
    const planningPrompt =
      settings.promptVersion === DEFAULT_PLANNING_PROMPT_VERSION
        ? settings.planningPrompt
        : DEFAULT_PLANNING_PROMPT;
    const promptVersion = DEFAULT_PLANNING_PROMPT_VERSION;
    const result = await requestSermonPlan({
      sermonTitle: persisted.church.sermonTitle,
      sermonDate: persisted.church.sermonDate,
      sermonNotes: persisted.church.sermonNotes,
      primaryScripture: persisted.church.primaryScripture || undefined,
      sermonSpeaker: persisted.church.speaker || undefined,
      churchName: persisted.church.churchName || undefined,
      sermonUrl: persisted.church.sermonUrl || undefined,
      planningPrompt,
      model: settings.model,
    });

    const withPlan = applySermonPlanToWeeklyPlan(persisted, result.plan as SermonPlan, {
      modelUsed: result.modelUsed,
      promptVersion,
    });
    const saved = await saveWeeklyPlan({
      ...withPlan,
      biblical: { ...withPlan.biblical, approved: true },
    });
    const activated = await activateBiblicalWeek(saved.id);
    return {
      ok: true,
      sermon: sermonRecordFromPlan(activated),
      week: biblicalWeekFromPlan(activated),
      plan: activated,
    };
  } catch (e) {
    const message =
      e instanceof SermonPlanClientError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Weekly training could not be generated.';
    return {
      ok: false,
      sermonSaved: true,
      sermon,
      plan: persisted,
      error: message,
    };
  }
}
