export type ServingQuestionType = 'text';

export interface ServingSection {
  id: string;
  title: string;
  subtitle: string;
  milestone: string;
}

export interface ServingQuestion {
  id: string;
  sectionId: string;
  text: string;
  type: ServingQuestionType;
}

export const SERVING_SECTIONS: ServingSection[] = [
  {
    id: 'strengths',
    title: 'How you help',
    subtitle: 'Think about when you feel useful, not when you feel guilty. There are no wrong answers.',
    milestone: 'Trailhead',
  },
  {
    id: 'energy',
    title: 'Energy & limits',
    subtitle: 'Knowing what drains you is as important as knowing what you are good at.',
    milestone: 'Ridge line',
  },
  {
    id: 'style',
    title: 'Your style',
    subtitle: 'How you work best with people — one-on-one, behind the scenes, or up front.',
    milestone: 'Creek bed',
  },
  {
    id: 'direction',
    title: 'Where to aim next',
    subtitle: 'A realistic look at what you might try or grow into over the next season.',
    milestone: 'Lookout',
  },
];

export const SERVING_QUESTIONS: ServingQuestion[] = [
  { id: 'serve-enjoy', sectionId: 'strengths', text: 'What kinds of help do you genuinely enjoy giving others?', type: 'text' },
  { id: 'serve-useful', sectionId: 'strengths', text: 'Describe a time you felt especially useful to someone. What were you actually doing?', type: 'text' },
  { id: 'serve-skills', sectionId: 'strengths', text: 'What do people most often ask you for help with?', type: 'text' },
  { id: 'serve-drained', sectionId: 'energy', text: 'What kinds of tasks or requests drain you quickly — even when they are good causes?', type: 'text' },
  { id: 'serve-avoid', sectionId: 'energy', text: 'What helping roles have you tried and not enjoyed? What made them a poor fit?', type: 'text' },
  { id: 'serve-visible', sectionId: 'style', text: 'Do you prefer a visible role or working behind the scenes? Why?', type: 'text' },
  { id: 'serve-setting', sectionId: 'style', text: 'Are you more energized by one-on-one help or group settings?', type: 'text' },
  { id: 'serve-learn', sectionId: 'direction', text: 'What skill would you like to develop so you can help others more effectively?', type: 'text' },
  { id: 'serve-saturday', sectionId: 'direction', text: 'If you had a free Saturday to help somewhere, what would you want to do?', type: 'text' },
];

export function getServingSectionQuestions(sectionId: string): ServingQuestion[] {
  return SERVING_QUESTIONS.filter((q) => q.sectionId === sectionId);
}

export const SERVING_SECTION_COUNT = SERVING_SECTIONS.length;

export const SERVING_INTRO = {
  title: 'Serving discovery',
  subtitle: 'Find where you fit best',
  lead: 'Not a spiritual gifts quiz or a volunteer signup form. A short, honest conversation about your strengths, limits, and the kinds of work where you tend to be most useful.',
};
