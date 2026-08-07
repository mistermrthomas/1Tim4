import { describe, expect, it } from 'vitest';
import {
  emptyStructuredAnalysis,
  validateAnalyzeRequest,
  validateStructuredAnalysis,
  type StructuredChurchAnalysis,
} from '../../../shared/churchNotesAnalysis';
import { CHURCH_NOTES_FIXTURE_RAW } from './fixture';
import { mondayAfterSermon, buildWeeklyFormationPlan, createDraftSermonNote } from './planFromAnalysis';
import {
  __resetChurchNotesMemoryForTests,
  getActiveFormationPlanForDate,
  getSermonNote,
  saveSermonAnalysis,
  saveSermonNote,
  saveWeeklyFormationPlan,
  updateSermonNoteMeta,
} from './store';
import type { SermonAnalysis } from './types';

function sampleAnalysis(overrides?: Partial<StructuredChurchAnalysis>): StructuredChurchAnalysis {
  const base = emptyStructuredAnalysis();
  return {
    ...base,
    sermonSummary: 'Do not conform — be transformed by renewing your mind.',
    centralMessage: 'Intentional spiritual formation resists worldly drift.',
    scripturePassages: [
      {
        reference: 'Romans 12:1-2',
        contextFromNotes: 'Do not conform — be transformed',
        confidence: 'explicit',
      },
      {
        reference: 'James 1:13-15',
        contextFromNotes: 'Temptation is like bait with a hook',
        confidence: 'explicit',
      },
      {
        reference: '2 Timothy 4:3-5',
        contextFromNotes: 'Truth has become personal, not absolute',
        confidence: 'explicit',
      },
    ],
    teachingPoints: [
      {
        title: 'Environment forms you',
        explanation: 'What is around you gets in you.',
        supportingNotes: ['Church is like a smoker', 'Sit in it low and slow'],
      },
    ],
    illustrations: [
      {
        name: 'Church is like a smoker',
        meaning: 'Proximity to an environment transfers its aroma over time.',
      },
    ],
    personalQuestions: ['If I was the enemy, what would take me out?'],
    possibleBait: [
      {
        bait: 'Success or material things as unique bait',
        whyItMayBeRelevant: 'Notes list success, failure, material things, relationships.',
        evidenceFromNotes: 'If I was the enemy, what would take me out?',
        certainty: 'possible',
      },
    ],
    weeklyTheme: 'Be transformed — out-disciple the algorithm',
    memoryVerse: {
      reference: 'Romans 12:2',
      reason: 'Central call not to conform but be transformed.',
    },
    practicalResponse: ['Name your unique bait and refuse to twist truth to fit it.'],
    prayerFocus: ['Ask for a renewed mind that smells like Jesus.'],
    announcements: [
      {
        title: 'Revival nights',
        date: 'August 23-25',
        details: 'Liquid fast those three days. Sing — bring — pray.',
      },
    ],
    clarificationsNeeded: ['September at the — incomplete in notes; do not invent meaning.'],
    sevenDayPlan: Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      theme: i === 4 || i === 5 ? 'Weekly review' : 'Formation over conformity',
      beforeReadingPrompt: 'Ask the Holy Spirit to show you what is shaping your thinking.',
      reflectionQuestion:
        i === 4 || i === 5
          ? 'Where did you notice transformation — or drift — this week?'
          : 'Where do you see dependence on God rather than self-sufficiency?',
      prayerPrompt: 'Pray for a teachable heart.',
    })),
    ...overrides,
  };
}

describe('church notes request validation', () => {
  it('accepts fixture-sized notes with reading plan context', () => {
    const result = validateAnalyzeRequest({
      sermonDate: '2026-08-02',
      rawNotes: CHURCH_NOTES_FIXTURE_RAW,
      currentReadingPlan: { book: 'Acts', cadence: 'one chapter per day', currentChapter: 1 },
      relevantPersonalContext: ['Direct toward Scripture then get out of the way.'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rawNotes).toContain('Romans 12:1-2');
      expect(result.value.currentReadingPlan?.book).toBe('Acts');
    }
  });

  it('rejects missing raw notes', () => {
    const result = validateAnalyzeRequest({ sermonDate: '2026-08-02', rawNotes: '  ' });
    expect(result.ok).toBe(false);
  });
});

describe('church notes structured output validation', () => {
  it('accepts a complete analysis', () => {
    const result = validateStructuredAnalysis(sampleAnalysis());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scripturePassages.map((p) => p.reference)).toEqual([
        'Romans 12:1-2',
        'James 1:13-15',
        '2 Timothy 4:3-5',
      ]);
      expect(result.value.illustrations[0]?.name).toMatch(/smoker/i);
      expect(result.value.clarificationsNeeded[0]).toMatch(/September at the/);
    }
  });

  it('rejects invalid output missing seven days', () => {
    const bad = sampleAnalysis({
      sevenDayPlan: sampleAnalysis().sevenDayPlan.slice(0, 3),
    });
    const result = validateStructuredAnalysis(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sevenDayPlan/);
  });

  it('rejects bad confidence values', () => {
    const bad = sampleAnalysis({
      scripturePassages: [
        {
          reference: 'Romans 12:1',
          contextFromNotes: 'x',
          confidence: 'guess' as 'explicit',
        },
      ],
    });
    const result = validateStructuredAnalysis(bad);
    expect(result.ok).toBe(false);
  });
});

describe('formation plan dating', () => {
  it('starts Monday after a Sunday sermon', () => {
    expect(mondayAfterSermon('2026-08-02')).toBe('2026-08-03');
  });
});

describe('church notes store', () => {
  it('preserves raw notes across meta updates and analysis save', async () => {
    __resetChurchNotesMemoryForTests();
    const note = createDraftSermonNote('user-1', '2026-08-02', {
      rawNotes: CHURCH_NOTES_FIXTURE_RAW,
      title: 'First Look Sunday',
    });
    await saveSermonNote(note);
    const analysis: SermonAnalysis = {
      id: 'a1',
      sermonNoteId: note.id,
      model: 'gpt-4o-mini',
      promptVersion: 'church-notes-v1',
      structuredAnalysis: sampleAnalysis(),
      userEditedAnalysis: sampleAnalysis(),
      generatedAt: new Date().toISOString(),
      approvedAt: null,
    };
    await saveSermonAnalysis(analysis);
    await updateSermonNoteMeta(note.id, { status: 'analyzed', title: 'Updated title' });
    const reloaded = await getSermonNote(note.id);
    expect(reloaded?.rawNotes).toBe(CHURCH_NOTES_FIXTURE_RAW);
    expect(reloaded?.title).toBe('Updated title');

    const plan = buildWeeklyFormationPlan({
      userId: 'user-1',
      sermonNote: reloaded!,
      analysis,
      edited: sampleAnalysis(),
    });
    await saveWeeklyFormationPlan(plan);
    const active = await getActiveFormationPlanForDate('2026-08-03');
    expect(active?.weeklyTheme).toMatch(/transformed/i);
    expect(active?.preservesReadingPlan).toBe(true);
  });
});
