import type { MorningMode } from '../../domain/formation/types';
import { resolveScriptureFromRefs } from '../../content/runtime/resolveScriptureFromRefs';
import type {
  InstalledSeasonPack,
  MorningVariantEntry,
  SeasonDayEntry,
  SeasonWeekEntry,
} from '../../content/types';
import type { ResolvedScripture } from '../../domain/scripture/types';

export interface PreviewDayModel {
  day: SeasonDayEntry;
  week: SeasonWeekEntry;
  morningMode: MorningMode;
  morning: MorningVariantEntry;
  teaching: NonNullable<InstalledSeasonPack['data']['teachings'][number]>;
  assignment: NonNullable<InstalledSeasonPack['data']['assignments'][number]>;
  scripture: ResolvedScripture;
  intentionPrompt: string;
  prayerPrompt: string;
  eveningPrompts: Array<{ id: string; text: string }>;
  middayPrompt: string | null;
  coachCard: string;
  workoutTitle: string | null;
  workoutItems: Array<{ name: string; sets: number; reps: string }>;
  recoveryTitle: string | null;
  seasonTitle: string;
  primaryFocus: string;
  secondaryFocus: string;
}

/** Pick a representative day for the preview (defaults to week-1 day-1). */
export function pickPreviewDay(pack: InstalledSeasonPack, dayKey = 'w1d1'): SeasonDayEntry {
  return pack.data.days.find((d) => d.dayKey === dayKey) ?? pack.data.days[0]!;
}

export function resolvePreviewDay(
  pack: InstalledSeasonPack,
  day: SeasonDayEntry,
  morningMode: MorningMode,
): PreviewDayModel {
  const week = pack.data.weeks.find((w) => w.weekIndex === day.weekIndex);
  if (!week) throw new Error(`Missing week ${day.weekIndex}`);

  const morningId = day.morningVariantIds[morningMode];
  const morning = pack.data.morningVariants.find((m) => m.id === morningId);
  if (!morning) throw new Error(`Missing morning variant ${morningId}`);

  const teaching = pack.data.teachings.find((t) => t.id === morning.teachingId);
  if (!teaching) throw new Error(`Missing teaching ${morning.teachingId}`);

  const assignment = pack.data.assignments.find((a) => a.id === day.assignmentId);
  if (!assignment) throw new Error(`Missing assignment ${day.assignmentId}`);

  const intention = pack.data.prompts.find((p) => p.id === morning.intentionPromptId);
  const prayer = pack.data.prompts.find((p) => p.id === morning.prayerPromptId);
  if (!intention || !prayer) throw new Error('Missing morning prompts');

  const scripture = resolveScriptureFromRefs(
    pack.data.scriptureReferences,
    pack.data.scriptureTexts,
    morning.primaryReferenceId,
    'web',
  );

  const eveningPrompts = day.eveningPromptIds.map((id) => {
    const p = pack.data.prompts.find((x) => x.id === id);
    return { id, text: p?.text ?? id };
  });

  const middayPrompt = day.middayPromptId
    ? (pack.data.prompts.find((p) => p.id === day.middayPromptId)?.text ?? null)
    : null;

  const coachIntent =
    pack.data.coachIntents.find((c) => c.intentKey === day.coachIntentKeys[0]) ??
    pack.data.coachIntents.find((c) => c.intentKey === 'daily_card');

  let workoutTitle: string | null = null;
  let workoutItems: PreviewDayModel['workoutItems'] = [];
  if (day.sessionType === 'workout' && day.workoutSessionId) {
    for (const template of pack.data.workouts.templates) {
      const session = template.sessions.find((s) => s.id === day.workoutSessionId);
      if (session) {
        workoutTitle = session.title;
        workoutItems = session.blocks.flatMap((b) =>
          b.items.map((item) => {
            const ex = pack.data.workouts.exercises.find((e) => e.id === item.exerciseId);
            return {
              name: ex?.name ?? item.exerciseId,
              sets: item.sets,
              reps: item.reps,
            };
          }),
        );
        break;
      }
    }
  }

  let recoveryTitle: string | null = null;
  if (day.recoveryDayId) {
    recoveryTitle = pack.data.recoveryDays.find((r) => r.id === day.recoveryDayId)?.title ?? null;
  } else if (morning.bodyAction.recoveryDayId) {
    recoveryTitle =
      pack.data.recoveryDays.find((r) => r.id === morning.bodyAction.recoveryDayId)?.title ?? null;
  }

  return {
    day,
    week,
    morningMode,
    morning,
    teaching,
    assignment,
    scripture,
    intentionPrompt: intention.text,
    prayerPrompt: prayer.text,
    eveningPrompts,
    middayPrompt,
    coachCard:
      coachIntent?.template
        .replace('{{primaryRef}}', morning.primaryReferenceId)
        .replace('{{supportingRefs}}', (morning.supportingReferenceIds ?? []).join(', ')) ??
      'Let’s prepare for the day.',
    workoutTitle,
    workoutItems,
    recoveryTitle,
    seasonTitle: pack.data.season.title,
    primaryFocus: pack.data.season.primaryFocusKey,
    secondaryFocus: pack.data.season.secondaryFocusKey,
  };
}
