import { FOCUS_PROFILES, type FocusProfile } from '../data/assessmentProfiles';
import type { AssessmentFocusKey, GrowthTheme, ReadingPlan, TrainingFocus } from '../types';
import { buildReadingPlanFromSource } from './readingPlanFromProfile';

const TITLE_TO_KEY: Record<string, AssessmentFocusKey> = {
  patience: 'patience',
  peace: 'peace',
  'self-control': 'self-control',
  selfcontrol: 'self-control',
  faithfulness: 'faithfulness',
  gentleness: 'gentleness',
  love: 'love',
  joy: 'joy',
  kindness: 'kindness',
  goodness: 'goodness',
  trust: 'trust',
  prayer: 'prayer',
  anxiety: 'anxiety',
  family: 'family',
  work: 'work',
  leadership: 'faithfulness',
  'setting priorities': 'faithfulness',
  priorities: 'faithfulness',
};

export function matchFocusProfile(title: string, themes: GrowthTheme[]): FocusProfile {
  const normalized = title.trim().toLowerCase();
  if (TITLE_TO_KEY[normalized]) {
    return FOCUS_PROFILES[TITLE_TO_KEY[normalized]];
  }

  for (const [key, profile] of Object.entries(FOCUS_PROFILES) as [AssessmentFocusKey, FocusProfile][]) {
    if (profile.title.toLowerCase() === normalized) return profile;
    if (key.replace(/-/g, ' ') === normalized) return profile;
  }

  if (normalized.includes('priorit') || normalized.includes('faithful')) {
    return FOCUS_PROFILES.faithfulness;
  }
  if (normalized.includes('peace') || normalized.includes('anxiet') || normalized.includes('worry')) {
    return FOCUS_PROFILES.peace;
  }
  if (normalized.includes('prayer')) return FOCUS_PROFILES.prayer;
  if (normalized.includes('patien')) return FOCUS_PROFILES.patience;
  if (normalized.includes('trust')) return FOCUS_PROFILES.trust;
  if (normalized.includes('family')) return FOCUS_PROFILES.family;

  for (const theme of themes) {
    for (const profile of Object.values(FOCUS_PROFILES)) {
      if (profile.themes.includes(theme)) return profile;
    }
  }

  return FOCUS_PROFILES.patience;
}

export function buildReadingPlanForFocus(title: string, themes: GrowthTheme[]): ReadingPlan {
  const profile = matchFocusProfile(title, themes);
  return buildReadingPlanFromSource({
    readingBook: profile.readingBook,
    readingStartChapter: profile.readingStartChapter,
    readingEndChapter: profile.readingEndChapter,
    readingScope: profile.readingScope,
    readingAnchorChapter: profile.readingChapter,
    readingAnchorLabel: profile.readingLabel,
  });
}

export function suggestedVerseForFocus(title: string, themes: GrowthTheme[]) {
  const profile = matchFocusProfile(title, themes);
  return profile.verses[0] ?? null;
}

export function readingSummaryForFocus(title: string, themes: GrowthTheme[]): string {
  const plan = buildReadingPlanForFocus(title, themes);
  const book = plan.currentBook;
  const start = plan.startChapter ?? plan.currentChapter;
  const end = plan.endChapter ?? start;
  if (plan.scopeMode === 'whole_book') {
    return `Read ${book} in order, starting at chapter ${start}`;
  }
  if (start === end) {
    return `Read ${book} ${start}`;
  }
  return `Read ${book} ${start}–${end}, one chapter at a time`;
}

export function ensureFocusHasReadingPlan(data: {
  trainingFocus: TrainingFocus | null;
  readingPlan: ReadingPlan;
}): ReadingPlan {
  if (!data.trainingFocus) return data.readingPlan;
  if (data.readingPlan?.currentBook?.trim()) return data.readingPlan;
  return buildReadingPlanForFocus(data.trainingFocus.title, data.trainingFocus.themes);
}
