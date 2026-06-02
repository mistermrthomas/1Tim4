import type { FruitOfSpirit } from '../types';

export const FRUIT_OPTIONS: FruitOfSpirit[] = [
  'Love',
  'Joy',
  'Peace',
  'Patience',
  'Kindness',
  'Goodness',
  'Faithfulness',
  'Gentleness',
  'Self-Control',
];

export type AssessmentQuestionType = 'text' | 'fruit';

export interface AssessmentSection {
  id: string;
  title: string;
  subtitle: string;
  milestone: string;
}

export interface AssessmentQuestion {
  id: string;
  sectionId: string;
  text: string;
  type: AssessmentQuestionType;
}

export const ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: 'season',
    title: 'Current season',
    subtitle: 'Every trail begins somewhere. Tell us about the terrain you are walking right now.',
    milestone: 'Base camp',
  },
  {
    id: 'god',
    title: 'Relationship with God',
    subtitle: 'A quiet conversation about where you are with the Lord on this stretch of the path.',
    milestone: 'Lookout',
  },
  {
    id: 'growth',
    title: 'Areas of growth',
    subtitle: 'Where the Spirit may be inviting you to train — not to grade you, but to understand your season.',
    milestone: 'Meadow',
  },
  {
    id: 'relationships',
    title: 'Relationships',
    subtitle: 'Formation happens in community. Share what is flourishing and what needs care.',
    milestone: 'River crossing',
  },
  {
    id: 'focus-discovery',
    title: 'Training focus discovery',
    subtitle: 'Patterns that often point toward a meaningful first training focus.',
    milestone: 'Switchback',
  },
  {
    id: 'reflection',
    title: 'Reflection',
    subtitle: 'Step back and name what you hope this season of training will hold.',
    milestone: 'Summit view',
  },
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // 1. Current season
  { id: 'season-thoughts', sectionId: 'season', text: 'What is occupying most of your thoughts right now?', type: 'text' },
  { id: 'season-joy', sectionId: 'season', text: 'What brings you the most joy right now?', type: 'text' },
  { id: 'season-stress', sectionId: 'season', text: 'What causes you the most stress right now?', type: 'text' },
  { id: 'season-prayer', sectionId: 'season', text: 'What are you praying about most often?', type: 'text' },
  { id: 'season-uncertain', sectionId: 'season', text: 'What area of life feels most uncertain right now?', type: 'text' },
  // 2. Relationship with God
  { id: 'god-scripture', sectionId: 'god', text: 'How consistent is your Scripture reading currently?', type: 'text' },
  { id: 'god-prayer', sectionId: 'god', text: 'How consistent is your prayer life currently?', type: 'text' },
  { id: 'god-close', sectionId: 'god', text: 'When do you feel closest to God?', type: 'text' },
  { id: 'god-far', sectionId: 'god', text: 'When do you feel furthest from God?', type: 'text' },
  { id: 'god-teaching', sectionId: 'god', text: 'Is there anything you feel God has been teaching you recently?', type: 'text' },
  // 3. Areas of growth
  { id: 'growth-most-need', sectionId: 'growth', text: 'What Fruit of the Spirit do you most need right now?', type: 'fruit' },
  { id: 'growth-most-natural', sectionId: 'growth', text: 'Which Fruit of the Spirit seems to come most naturally?', type: 'fruit' },
  { id: 'growth-most-difficult', sectionId: 'growth', text: 'Which Fruit of the Spirit feels most difficult?', type: 'fruit' },
  { id: 'growth-six-months', sectionId: 'growth', text: 'What would you most like God to change in you over the next six months?', type: 'text' },
  // 4. Relationships
  { id: 'relations-satisfied', sectionId: 'relationships', text: 'Where are you most satisfied right now?', type: 'text' },
  { id: 'relations-challenged', sectionId: 'relationships', text: 'Where do you feel most challenged?', type: 'text' },
  { id: 'relations-attention', sectionId: 'relationships', text: 'Is there a relationship that needs attention?', type: 'text' },
  { id: 'relations-roles', sectionId: 'relationships', text: 'How are you doing as a spouse, parent, friend, coworker, or church member?', type: 'text' },
  // 5. Training focus discovery
  { id: 'focus-frustration', sectionId: 'focus-discovery', text: 'What frustrates you most often?', type: 'text' },
  { id: 'focus-repent', sectionId: 'focus-discovery', text: 'What do you find yourself repenting of most often?', type: 'text' },
  { id: 'focus-worry', sectionId: 'focus-discovery', text: 'What do you worry about most often?', type: 'text' },
  { id: 'focus-habit', sectionId: 'focus-discovery', text: 'What habit would you most like to change?', type: 'text' },
  { id: 'focus-obedience', sectionId: 'focus-discovery', text: 'What area of obedience do you tend to avoid?', type: 'text' },
  // 6. Reflection
  { id: 'reflect-friend', sectionId: 'reflection', text: 'If someone who knows you well described your spiritual life today, what would they say?', type: 'text' },
  { id: 'reflect-children-thankful', sectionId: 'reflection', text: 'If your children copied your spiritual life exactly, what would make you thankful?', type: 'text' },
  { id: 'reflect-children-concern', sectionId: 'reflection', text: 'If your children copied your spiritual life exactly, what would concern you?', type: 'text' },
  { id: 'reflect-one-year', sectionId: 'reflection', text: 'One year from now, what would you hope has changed?', type: 'text' },
];

export function getSectionQuestions(sectionId: string): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS.filter((q) => q.sectionId === sectionId);
}

export const ASSESSMENT_SECTION_COUNT = ASSESSMENT_SECTIONS.length;

export const ASSESSMENT_INTRO = {
  title: 'Begin your trail',
  subtitle: 'Initial spiritual assessment',
  lead: 'This is not a test or a score. It is an intake conversation — like mapping the path ahead before your first season of training.',
};
