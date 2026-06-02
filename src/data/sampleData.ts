import type { AppData } from '../types';

const focusId = 'focus-patience';
const verseId = 'verse-james-119';

export const sampleData: AppData = {
  version: 1,
  journeyStartedAt: '2023-05-31',
  trainingFocus: {
    id: focusId,
    title: 'Patience',
    description: 'A season of learning to wait, listen, and respond with grace.',
    startedAt: '2026-03-12',
    themes: ['patience', 'anger', 'self-control'],
  },
  trainingFocusHistory: [],
  trainingVerse: {
    id: verseId,
    reference: 'James 1:19',
    text: 'Everyone should be quick to listen, slow to speak, and slow to become angry.',
    startedAt: '2026-03-12',
    linkedFocusId: focusId,
    themes: ['patience', 'anger'],
  },
  trainingVerseArchive: [
    {
      id: 'verse-phil-46',
      reference: 'Philippians 4:6',
      text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
      startedAt: '2025-11-01',
      endedAt: '2026-03-11',
      themes: ['anxiety', 'prayer', 'peace'],
    },
  ],
  spiritualAssessment: null,
  readingPlan: {
    currentBook: 'James',
    currentChapter: 1,
    chaptersCompletedInBook: [],
  },
  readingLog: [
    { id: 'r1', book: 'James', chapter: 1, date: '2026-05-31' },
    { id: 'r2', book: 'James', chapter: 1, date: '2026-05-30' },
    { id: 'r3', book: 'Philippians', chapter: 4, date: '2026-05-30' },
    { id: 'r4', book: 'Philippians', chapter: 3, date: '2026-05-29' },
    { id: 'r5', book: 'Philippians', chapter: 2, date: '2026-05-28' },
  ],
  dailyEntries: {
    '2026-05-30': {
      date: '2026-05-30',
      prepare: {
        completedAt: '2026-05-30T07:15:00',
        chaptersRead: [{ book: 'James', chapter: 1 }],
        keyVerses: [{ reference: 'James 1:19', text: 'Everyone should be quick to listen, slow to speak, and slow to become angry.' }],
        standoutVerses: [{ reference: 'James 1:2-3', text: 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds...' }],
        notes: 'Need patience most in conversations with my team today.',
        responses: [
          { questionId: 'prepare-god', questionText: 'What did I learn about God?', answer: 'God is patient with my growth — I can extend that to others.' },
          { questionId: 'prepare-struggle', questionText: 'What am I struggling with?', answer: 'Impatience in traffic and at home.' },
        ],
      },
      live: {
        completedAt: '2026-05-30T12:30:00',
        responses: [
          { questionId: 'live-doing', questionText: 'How are you doing?', answer: 'Tense but aware. Pausing before responding.' },
          { questionId: 'live-focus', questionText: "Have you remembered today's focus?", answer: 'Yes — repeated James 1:19 before a hard meeting.' },
        ],
      },
      reflect: {
        completedAt: '2026-05-30T21:00:00',
        responses: [
          { questionId: 'reflect-god', questionText: 'Where did I see God at work today?', answer: 'In the pause before I responded during a hard conversation at work.' },
          { questionId: 'reflect-focus', questionText: "What happened with today's focus area?", answer: 'I paused before responding — that was patience.' },
          { questionId: 'reflect-thankful', questionText: 'What am I thankful for?', answer: 'Grateful for James 1:19 carrying me through.' },
        ],
        lessonIds: ['lesson-1'],
      },
    },
    '2026-05-29': {
      date: '2026-05-29',
      prepare: {
        completedAt: '2026-05-29T07:00:00',
        chaptersRead: [{ book: 'Philippians', chapter: 3 }],
        keyVerses: [],
        standoutVerses: [{ reference: 'Philippians 3:13-14', text: 'Forgetting what is behind and straining toward what is ahead, I press on...' }],
        notes: '',
        responses: [
          { questionId: 'prepare-truth', questionText: 'What truth do I need to remember today?', answer: 'Forward motion, not perfection.' },
        ],
      },
      reflect: {
        completedAt: '2026-05-29T20:45:00',
        responses: [
          { questionId: 'reflect-learned', questionText: 'What did I learn today?', answer: 'Patience with myself opens patience with others.' },
        ],
        lessonIds: ['lesson-2'],
      },
    },
  },
  prayers: [
    {
      id: 'p1',
      text: 'Wisdom for leading my team through a difficult season',
      createdAt: '2026-04-03',
      status: 'active',
      statusUpdatedAt: '2026-04-03',
    },
    {
      id: 'p2',
      text: "Healing for my mother's recovery",
      createdAt: '2026-02-18',
      status: 'partially_answered',
      statusUpdatedAt: '2026-05-15',
      notes: 'Showing improvement — physical therapy going well.',
    },
    {
      id: 'p3',
      text: 'Peace about a major career decision',
      createdAt: '2026-01-10',
      status: 'answered',
      statusUpdatedAt: '2026-03-20',
      notes: 'Clarity came through prayer and counsel.',
    },
  ],
  lessonsLearned: [
    {
      id: 'lesson-1',
      text: "Patience isn't passive — it's choosing to trust God's timing before I speak.",
      sourceDate: '2026-05-30',
      sourceType: 'reflect',
      focusId: focusId,
      themes: ['patience', 'trust'],
      createdAt: '2026-05-30T21:05:00',
    },
    {
      id: 'lesson-2',
      text: "Anger often masks fear. When I pause, I can ask what I'm actually afraid of.",
      sourceDate: '2026-05-22',
      sourceType: 'live',
      focusId: focusId,
      themes: ['anger', 'anxiety'],
      createdAt: '2026-05-22T12:45:00',
    },
    {
      id: 'lesson-3',
      text: 'God is not in a hurry with me — I can slow down with others.',
      sourceDate: '2026-05-15',
      sourceType: 'reflect',
      focusId: focusId,
      themes: ['patience'],
      createdAt: '2026-05-15T21:30:00',
    },
  ],
};
