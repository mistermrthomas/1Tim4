import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { flushCloudTrailPush, scheduleCloudTrailPush } from '../services/cloudTrailSync';
import { pickSuggestedPassage } from '../constants/quickStart';
import { FOCUS_PROFILES, profileToSuggestion } from '../data/assessmentProfiles';
import type {
  AppContextValue,
  AppData,
  AssessmentFocusKey,
  AssessmentSuggestion,
  DailyEntry,
  GrowthTheme,
  ReadingScopeMode,
  JourneyLogFilters,
  JourneyLogItem,
  JourneyStage,
  LessonLearned,
  LiveEntry,
  OnboardingProgress,
  PrayerStatus,
  PrepareEntry,
  ReflectEntry,
  ServingSuggestion,
  SpiritualAssessment,
  TrainingFocus,
  TrainingVerse,
} from '../types';
import { ASSESSMENT_SECTION_COUNT } from '../constants/assessment';
import { SERVING_SECTION_COUNT } from '../constants/servingAssessment';
import { fetchAiAssessmentGuidance } from '../services/assessmentAi';
import {
  buildSuggestionForFocus,
  generateAssessmentPlan,
} from '../utils/generateAssessmentPlan';
import { generateServingPlan } from '../utils/generateServingPlan';
import { advanceReadingPlan } from '../utils/readingPlan';
import { buildReadingPlanFromSource } from '../utils/readingPlanFromProfile';
import { buildPassageReadingPlan } from '../utils/quickStartPlan';
import { dayOfYear } from '../utils/date';
import {
  buildTrailBackup,
  downloadTrailBackup,
  parseTrailBackup,
} from '../utils/trailBackup';
import { isAppDataEmpty } from '../data/emptyData';
import { normalizeAppData } from '../storage/normalizeAppData';
import {
  getAppMode,
  loadAppData,
  loadDemoData as loadDemoFromStorage,
  promoteToLiveMode,
  saveAppData,
  startFreshTrail as startFreshFromStorage,
  type AppMode,
} from '../storage/storage';
import { createId } from '../utils/id';
import { toDateKey } from '../utils/date';

const AppContext = createContext<AppContextValue | null>(null);

function buildPreview(entry: DailyEntry, stage: JourneyStage): string {
  if (stage === 'prepare' && entry.prepare) {
    const p = entry.prepare;
    if (p.notes) return p.notes;
    const first = p.responses.find((r) => r.answer.trim());
    if (first) return first.answer;
    if (p.standoutVerses[0]) return p.standoutVerses[0].reference + ' stood out.';
    if (p.chaptersRead[0]) {
      const c = p.chaptersRead[0];
      return `Read ${c.book} ${c.chapter}.`;
    }
    return 'Morning preparation recorded.';
  }
  if (stage === 'live' && entry.live) {
    const first = entry.live.responses.find((r) => r.answer.trim());
    return first?.answer ?? 'Midday check-in recorded.';
  }
  if (stage === 'reflect' && entry.reflect) {
    const first = entry.reflect.responses.find((r) => r.answer.trim());
    return first?.answer ?? 'Evening reflection recorded.';
  }
  return '';
}

function getBooksCompleted(readingLog: AppData['readingLog']): string[] {
  const byBook = new Map<string, Set<number>>();
  for (const entry of readingLog) {
    if (!byBook.has(entry.book)) byBook.set(entry.book, new Set());
    byBook.get(entry.book)!.add(entry.chapter);
  }
  const completed: string[] = [];
  const bookChapterCounts: Record<string, number> = {
    James: 5,
    Philippians: 4,
    Romans: 16,
    Psalms: 150,
  };
  for (const [book, chapters] of byBook) {
    const expected = bookChapterCounts[book];
    if (expected && chapters.size >= expected) {
      completed.push(book);
    }
  }
  return completed;
}

export function AppProvider({
  profileId,
  profileName,
  children,
}: {
  profileId: string;
  profileName: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(() => loadAppData(profileId));
  const [appMode, setAppModeState] = useState<AppMode>(() => {
    const mode = getAppMode(profileId);
    if (mode) return mode;
    return isAppDataEmpty(loadAppData(profileId)) ? 'new' : 'live';
  });
  const dataRef = useRef(data);
  const appModeRef = useRef(appMode);
  dataRef.current = data;
  appModeRef.current = appMode;

  const today = toDateKey();
  const isEmpty = isAppDataEmpty(data);

  useEffect(() => {
    if (!user) return;

    const flush = () => flushCloudTrailPush(profileId);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, profileId]);

  const persist = useCallback(
    (next: AppData, options?: { promoteLive?: boolean }) => {
      const safe = normalizeAppData(next);
      setData(safe);
      saveAppData(profileId, safe);
      let mode = getAppMode(profileId) ?? appModeRef.current;
      if (options?.promoteLive !== false && !isAppDataEmpty(safe)) {
        if (mode === 'new' || mode === null) {
          promoteToLiveMode(profileId);
          setAppModeState('live');
          mode = 'live';
        }
      }
      dataRef.current = safe;
      appModeRef.current = mode;

      if (user) {
        scheduleCloudTrailPush(
          user.id,
          profileId,
          profileName,
          () => dataRef.current,
          () => appModeRef.current,
        );
      }
    },
    [profileId, profileName, user],
  );

  const loadDemoData = useCallback(() => {
    const next = loadDemoFromStorage(profileId);
    setData(next);
    setAppModeState('demo');
  }, [profileId]);

  const startFreshTrail = useCallback(() => {
    const next = startFreshFromStorage(profileId);
    setData(next);
    setAppModeState('new');
  }, [profileId]);

  const todayEntry = data.dailyEntries[today] ?? { date: today };

  const savePrepare = useCallback(
    (entry: Omit<PrepareEntry, 'completedAt'>) => {
      const next = structuredClone(data);
      const daily: DailyEntry = next.dailyEntries[today] ?? { date: today };
      daily.prepare = { ...entry, completedAt: new Date().toISOString() };
      next.dailyEntries[today] = daily;

      for (const ch of entry.chaptersRead) {
        const exists = next.readingLog.some(
          (r) => r.book === ch.book && r.chapter === ch.chapter && r.date === today,
        );
        if (!exists) {
          next.readingLog.push({
            id: createId(),
            book: ch.book,
            chapter: ch.chapter,
            date: today,
          });
        }
      }

      if (entry.chaptersRead.length > 0) {
        next.readingPlan = advanceReadingPlan(next.readingPlan, entry.chaptersRead);
      }

      persist(next);
    },
    [data, today, persist],
  );

  const saveLive = useCallback(
    (entry: Omit<LiveEntry, 'completedAt'>) => {
      const next = structuredClone(data);
      const daily: DailyEntry = next.dailyEntries[today] ?? { date: today };
      daily.live = { ...entry, completedAt: new Date().toISOString() };
      next.dailyEntries[today] = daily;
      persist(next);
    },
    [data, today, persist],
  );

  const saveReflect = useCallback(
    (
      entry: Omit<ReflectEntry, 'completedAt' | 'lessonIds'>,
      newLessons: string[],
    ) => {
      const next = structuredClone(data);
      const daily: DailyEntry = next.dailyEntries[today] ?? { date: today };
      const lessonIds: string[] = [];

      for (const text of newLessons) {
        if (!text.trim()) continue;
        const lesson: LessonLearned = {
          id: createId(),
          text: text.trim(),
          sourceDate: today,
          sourceType: 'reflect',
          focusId: next.trainingFocus?.id,
          themes: next.trainingFocus?.themes ?? [],
          createdAt: new Date().toISOString(),
        };
        next.lessonsLearned.unshift(lesson);
        lessonIds.push(lesson.id);
      }

      daily.reflect = {
        ...entry,
        completedAt: new Date().toISOString(),
        lessonIds,
      };
      next.dailyEntries[today] = daily;
      persist(next);
    },
    [data, today, persist],
  );

  const addPrayer = useCallback(
    (text: string) => {
      const next = structuredClone(data);
      next.prayers.unshift({
        id: createId(),
        text,
        createdAt: today,
        status: 'active',
        statusUpdatedAt: today,
      });
      persist(next);
    },
    [data, today, persist],
  );

  const updatePrayerStatus = useCallback(
    (id: string, status: PrayerStatus) => {
      const next = structuredClone(data);
      const prayer = next.prayers.find((p) => p.id === id);
      if (prayer) {
        prayer.status = status;
        prayer.statusUpdatedAt = today;
      }
      persist(next);
    },
    [data, today, persist],
  );

  const updatePrayerNotes = useCallback(
    (id: string, notes: string) => {
      const next = structuredClone(data);
      const prayer = next.prayers.find((p) => p.id === id);
      if (prayer) prayer.notes = notes;
      persist(next);
    },
    [data, today, persist],
  );

  const getJourneyLog = useCallback(
    (filters?: JourneyLogFilters): JourneyLogItem[] => {
      const items: JourneyLogItem[] = [];
      const focusMap = new Map<string, string>();
      if (data.trainingFocus) focusMap.set(data.trainingFocus.id, data.trainingFocus.title);
      for (const f of data.trainingFocusHistory) focusMap.set(f.id, f.title);

      for (const [date, entry] of Object.entries(data.dailyEntries)) {
        const stages: JourneyStage[] = ['prepare', 'live', 'reflect'];
        for (const stage of stages) {
          const has =
            (stage === 'prepare' && entry.prepare) ||
            (stage === 'live' && entry.live) ||
            (stage === 'reflect' && entry.reflect);
          if (!has) continue;

          const book = entry.prepare?.chaptersRead[0]?.book;
          const themes = data.trainingFocus?.themes ?? [];

          items.push({
            id: `${date}-${stage}`,
            date,
            stage,
            preview: buildPreview(entry, stage),
            focusTitle: data.trainingFocus?.title,
            book,
            themes,
          });
        }
      }

      items.sort((a, b) => b.date.localeCompare(a.date) || stageOrder(b.stage) - stageOrder(a.stage));

      return items.filter((item) => {
        if (filters?.dateFrom && item.date < filters.dateFrom) return false;
        if (filters?.dateTo && item.date > filters.dateTo) return false;
        if (filters?.book && item.book !== filters.book) return false;
        if (filters?.theme && !item.themes.includes(filters.theme)) return false;
        if (filters?.focusId) {
          const focus = data.trainingFocus;
          if (!focus || focus.id !== filters.focusId) {
            const hist = data.trainingFocusHistory.find((f) => f.id === filters.focusId);
            if (!hist && focus?.id !== filters.focusId) return false;
          }
        }
        return true;
      });
    },
    [data],
  );

  const getRelatedLessons = useCallback(
    (focusId: string): LessonLearned[] =>
      data.lessonsLearned.filter((l) => l.focusId === focusId),
    [data.lessonsLearned],
  );

  const setTrainingFocus = useCallback(
    (focus: Omit<TrainingFocus, 'id' | 'startedAt'>) => {
      const next = structuredClone(data);
      if (next.trainingFocus) {
        next.trainingFocus.endedAt = today;
        next.trainingFocusHistory.push(next.trainingFocus);
      }
      next.trainingFocus = {
        ...focus,
        id: createId(),
        startedAt: today,
      };
      persist(next);
    },
    [data, today, persist],
  );

  const setTrainingVerse = useCallback(
    (verse: Omit<TrainingVerse, 'id' | 'startedAt' | 'endedAt'>) => {
      const next = structuredClone(data);
      if (next.trainingVerse) {
        next.trainingVerse.endedAt = today;
        next.trainingVerseArchive.push(next.trainingVerse);
      }
      next.trainingVerse = {
        ...verse,
        id: createId(),
        startedAt: today,
      };
      persist(next);
    },
    [data, today, persist],
  );

  const archiveTrainingVerse = useCallback(() => {
    const next = structuredClone(data);
    if (next.trainingVerse) {
      next.trainingVerse.endedAt = today;
      next.trainingVerseArchive.unshift(next.trainingVerse);
      next.trainingVerse = null;
      persist(next);
    }
  }, [data, today, persist]);

  const startAssessment = useCallback(() => {
    const next = structuredClone(data);
    next.spiritualAssessment = {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      sectionIndex: 0,
      answers: {},
    };
    persist(next, { promoteLive: false });
  }, [data, persist]);

  const saveAssessmentProgress = useCallback(
    (sectionIndex: number, answers: Record<string, string>) => {
      const next = structuredClone(data);
      const existing = next.spiritualAssessment;
      next.spiritualAssessment = {
        status: 'in_progress',
        startedAt: existing?.startedAt ?? new Date().toISOString(),
        sectionIndex,
        answers: { ...existing?.answers, ...answers },
      };
      persist(next, { promoteLive: false });
    },
    [data, persist],
  );

  const completeAssessment = useCallback(
    async (answers: Record<string, string>): Promise<AssessmentSuggestion> => {
      const merged = { ...data.spiritualAssessment?.answers, ...answers };
      const rulePlan = generateAssessmentPlan(merged);
      let suggestion: AssessmentSuggestion = { ...rulePlan, guidanceSource: 'rules' };

      const ai = await fetchAiAssessmentGuidance(merged, rulePlan);
      if (ai) {
        suggestion = {
          ...buildSuggestionForFocus(ai.focusKey, merged, ai.whyFocus),
          guidanceSource: 'ai',
        };
      }

      const next = structuredClone(data);
      next.spiritualAssessment = {
        status: 'completed',
        startedAt: data.spiritualAssessment?.startedAt ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
        sectionIndex: ASSESSMENT_SECTION_COUNT - 1,
        answers: merged,
        suggestion,
      };
      persist(next, { promoteLive: false });
      return suggestion;
    },
    [data, persist],
  );

  const acceptAssessmentPlan = useCallback(
    (plan: {
      focusTitle: string;
      focusDescription: string;
      focusThemes: GrowthTheme[];
      verseReference: string;
      verseText: string;
      readingBook: string;
      readingChapter: number;
      readingStartChapter: number;
      readingEndChapter: number;
      readingScope: ReadingScopeMode;
      readingAnchorLabel?: string;
    }) => {
      const next = structuredClone(data);
      const now = new Date().toISOString();

      if (next.trainingFocus) {
        next.trainingFocus.endedAt = today;
        next.trainingFocusHistory.push(next.trainingFocus);
      }
      next.trainingFocus = {
        id: createId(),
        title: plan.focusTitle,
        description: plan.focusDescription,
        startedAt: today,
        themes: plan.focusThemes,
      };

      if (next.trainingVerse) {
        next.trainingVerse.endedAt = today;
        next.trainingVerseArchive.push(next.trainingVerse);
      }
      next.trainingVerse = {
        id: createId(),
        reference: plan.verseReference,
        text: plan.verseText,
        startedAt: today,
        linkedFocusId: next.trainingFocus.id,
        themes: plan.focusThemes,
      };

      next.readingPlan = buildReadingPlanFromSource({
        readingBook: plan.readingBook,
        readingStartChapter: plan.readingStartChapter,
        readingEndChapter: plan.readingEndChapter,
        readingScope: plan.readingScope,
        readingAnchorChapter: plan.readingChapter,
        readingAnchorLabel: plan.readingAnchorLabel ?? `${plan.readingBook} ${plan.readingChapter}`,
      });

      const assessment: SpiritualAssessment = next.spiritualAssessment ?? {
        status: 'in_progress',
        startedAt: now,
        sectionIndex: 0,
        answers: {},
      };
      next.spiritualAssessment = {
        ...assessment,
        status: 'accepted',
        acceptedAt: now,
        acceptedFocusTitle: plan.focusTitle,
        acceptedVerseReference: plan.verseReference,
        suggestion: assessment.suggestion ?? generateAssessmentPlan(assessment.answers),
      };

      next.onboardingProgress = {
        ...next.onboardingProgress,
        dismissed: false,
      };
      next.trailStartMode = 'assessment';

      persist(next);
    },
    [data, today, persist],
  );

  const applyPlanFromSuggestion = useCallback(
    (next: AppData, suggestion: AssessmentSuggestion) => {
      if (next.trainingFocus) {
        next.trainingFocus.endedAt = today;
        next.trainingFocusHistory.push(next.trainingFocus);
      }
      next.trainingFocus = {
        id: createId(),
        title: suggestion.focusTitle,
        description: suggestion.focusDescription,
        startedAt: today,
        themes: suggestion.focusThemes,
      };

      if (next.trainingVerse) {
        next.trainingVerse.endedAt = today;
        next.trainingVerseArchive.push(next.trainingVerse);
      }
      next.trainingVerse = {
        id: createId(),
        reference: suggestion.verseReference,
        text: suggestion.verseText,
        startedAt: today,
        linkedFocusId: next.trainingFocus.id,
        themes: suggestion.focusThemes,
      };

      next.readingPlan = buildReadingPlanFromSource({
        readingBook: suggestion.readingBook,
        readingStartChapter: suggestion.readingStartChapter,
        readingEndChapter: suggestion.readingEndChapter,
        readingScope: suggestion.readingScope,
        readingAnchorChapter: suggestion.readingChapter,
        readingAnchorLabel: suggestion.readingLabel,
      });
    },
    [today],
  );

  const quickStartPassage = useCallback(
    (book: string, chapter: number) => {
      const next = structuredClone(data);
      next.readingPlan = buildPassageReadingPlan(book, chapter);
      next.trailStartMode = 'quick_read';
      next.onboardingProgress = { ...next.onboardingProgress, dismissed: false };
      persist(next);
    },
    [data, persist],
  );

  const quickStartWithPath = useCallback(
    (focusKey: AssessmentFocusKey) => {
      const profile = FOCUS_PROFILES[focusKey];
      const suggestion = profileToSuggestion(
        profile,
        `You chose ${profile.title} as your path — begin reading and reflecting at your own pace.`,
      );
      const next = structuredClone(data);
      applyPlanFromSuggestion(next, suggestion);
      next.trailStartMode = 'quick_path';
      next.onboardingProgress = { ...next.onboardingProgress, dismissed: false };
      persist(next);
    },
    [data, persist, applyPlanFromSuggestion],
  );

  const getSuggestedPassage = useCallback(() => {
    const p = pickSuggestedPassage(dayOfYear() + data.journeyStartedAt.length);
    return { book: p.book, chapter: p.chapter, label: p.label, hint: p.hint };
  }, [data.journeyStartedAt.length]);

  const resetSpiritualAssessment = useCallback(() => {
    const next = structuredClone(data);
    next.spiritualAssessment = null;
    persist(next, { promoteLive: false });
  }, [data, persist]);

  const exportTrailBackup = useCallback(
    (profileName: string) => {
      const backup = buildTrailBackup(profileId, profileName, data);
      downloadTrailBackup(backup);
      const next = structuredClone(data);
      next.lastBackupAt = backup.exportedAt;
      next.onboardingProgress = { ...next.onboardingProgress, backupExported: true };
      persist(next, { promoteLive: false });
    },
    [profileId, data, persist],
  );

  const importTrailBackup = useCallback(
    async (file: File) => {
      const text = await file.text();
      const backup = parseTrailBackup(text);
      if (backup.profileId !== profileId) {
        if (
          !window.confirm(
            `This backup belongs to "${backup.profileName}". Import it into your current profile anyway?`,
          )
        ) {
          return;
        }
      }
      if (
        !window.confirm(
          'Import will replace your current trail data on this device. Continue?',
        )
      ) {
        return;
      }
      setData(backup.appData);
      saveAppData(profileId, backup.appData);
      const mode = getAppMode(profileId);
      setAppModeState(mode === 'demo' ? 'demo' : isAppDataEmpty(backup.appData) ? 'new' : 'live');
    },
    [profileId],
  );

  const dismissOnboardingChecklist = useCallback(() => {
    const next = structuredClone(data);
    next.onboardingProgress = { ...next.onboardingProgress, dismissed: true };
    persist(next, { promoteLive: false });
  }, [data, persist]);

  const markOnboardingItem = useCallback(
    (key: keyof OnboardingProgress, value = true) => {
      const next = structuredClone(data);
      next.onboardingProgress = { ...next.onboardingProgress, [key]: value };
      persist(next, { promoteLive: false });
    },
    [data, persist],
  );

  const startServingDiscovery = useCallback(() => {
    const next = structuredClone(data);
    next.servingDiscovery = {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      sectionIndex: 0,
      answers: {},
    };
    persist(next, { promoteLive: false });
  }, [data, persist]);

  const saveServingProgress = useCallback(
    (sectionIndex: number, answers: Record<string, string>) => {
      const next = structuredClone(data);
      const existing = next.servingDiscovery;
      next.servingDiscovery = {
        status: 'in_progress',
        startedAt: existing?.startedAt ?? new Date().toISOString(),
        sectionIndex,
        answers: { ...existing?.answers, ...answers },
      };
      persist(next, { promoteLive: false });
    },
    [data, persist],
  );

  const completeServingDiscovery = useCallback(
    (answers: Record<string, string>): ServingSuggestion => {
      const merged = { ...data.servingDiscovery?.answers, ...answers };
      const suggestion = generateServingPlan(merged);
      const next = structuredClone(data);
      next.servingDiscovery = {
        status: 'completed',
        startedAt: data.servingDiscovery?.startedAt ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
        sectionIndex: SERVING_SECTION_COUNT - 1,
        answers: merged,
        suggestion,
      };
      persist(next, { promoteLive: false });
      return suggestion;
    },
    [data, persist],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      appMode,
      isEmpty,
      today,
      todayEntry,
      loadDemoData,
      startFreshTrail,
      savePrepare,
      saveLive,
      saveReflect,
      addPrayer,
      updatePrayerStatus,
      updatePrayerNotes,
      getJourneyLog,
      getRelatedLessons,
      getBooksCompleted: () => getBooksCompleted(data.readingLog),
      getChapterCount: () => data.readingLog.length,
      setTrainingFocus,
      setTrainingVerse,
      archiveTrainingVerse,
      spiritualAssessment: data.spiritualAssessment,
      startAssessment,
      saveAssessmentProgress,
      completeAssessment,
      acceptAssessmentPlan,
      resetSpiritualAssessment,
      exportTrailBackup,
      importTrailBackup,
      servingDiscovery: data.servingDiscovery ?? null,
      startServingDiscovery,
      saveServingProgress,
      completeServingDiscovery,
      dismissOnboardingChecklist,
      markOnboardingItem,
      quickStartPassage,
      quickStartWithPath,
      getSuggestedPassage,
    }),
    [
      data,
      appMode,
      isEmpty,
      today,
      todayEntry,
      loadDemoData,
      startFreshTrail,
      savePrepare,
      saveLive,
      saveReflect,
      addPrayer,
      updatePrayerStatus,
      updatePrayerNotes,
      getJourneyLog,
      getRelatedLessons,
      setTrainingFocus,
      setTrainingVerse,
      archiveTrainingVerse,
      data.spiritualAssessment,
      startAssessment,
      saveAssessmentProgress,
      completeAssessment,
      acceptAssessmentPlan,
      resetSpiritualAssessment,
      exportTrailBackup,
      importTrailBackup,
      data.servingDiscovery,
      startServingDiscovery,
      saveServingProgress,
      completeServingDiscovery,
      dismissOnboardingChecklist,
      markOnboardingItem,
      quickStartPassage,
      quickStartWithPath,
      getSuggestedPassage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function stageOrder(stage: JourneyStage): number {
  return { prepare: 0, live: 1, reflect: 2 }[stage];
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
