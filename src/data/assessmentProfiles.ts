import type { AssessmentFocusKey, AssessmentSuggestion, GrowthTheme } from '../types';
import type { FocusVisualKey } from '../utils/focusVisuals';

export interface FocusProfile {
  key: AssessmentFocusKey;
  title: string;
  description: string;
  themes: GrowthTheme[];
  keywords: string[];
  dailyEmphasis: string;
  readingLabel: string;
  readingBook: string;
  readingChapter: number;
  verses: { reference: string; text: string }[];
}

export const FOCUS_PROFILES: Record<AssessmentFocusKey, FocusProfile> = {
  patience: {
    key: 'patience',
    title: 'Patience',
    description: 'A season of learning to wait, listen, and respond with grace rather than reaction.',
    themes: ['patience', 'anger', 'self-control'],
    keywords: [
      'frustrat', 'impati', 'wait', 'waiting', 'hurry', 'quick', 'react', 'anger', 'angry',
      'snap', 'rush', 'slow to speak', 'listen first',
    ],
    dailyEmphasis: 'Practice listening before responding.',
    readingLabel: 'James 1',
    readingBook: 'James',
    readingChapter: 1,
    verses: [
      {
        reference: 'James 1:19',
        text: 'Everyone should be quick to listen, slow to speak and slow to become angry.',
      },
      {
        reference: 'Romans 12:12',
        text: 'Be joyful in hope, patient in affliction, faithful in prayer.',
      },
    ],
  },
  peace: {
    key: 'peace',
    title: 'Peace',
    description: 'A season of resting in Christ when life feels noisy, uncertain, or overwhelming.',
    themes: ['peace', 'anxiety', 'trust'],
    keywords: [
      'peace', 'calm', 'anxious', 'anxiety', 'worry', 'stress', 'overwhelm', 'restless',
      'fear', 'unsettled', 'turmoil', 'quiet',
    ],
    dailyEmphasis: 'Pause to name what you can entrust to God before acting.',
    readingLabel: 'Philippians 4',
    readingBook: 'Philippians',
    readingChapter: 4,
    verses: [
      {
        reference: 'Philippians 4:6-7',
        text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
      },
      {
        reference: 'John 14:27',
        text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.',
      },
    ],
  },
  'self-control': {
    key: 'self-control',
    title: 'Self-Control',
    description: 'A season of training desires, habits, and impulses toward obedience and freedom in Christ.',
    themes: ['self-control', 'anger', 'other'],
    keywords: [
      'habit', 'impulse', 'tempt', 'discipline', 'control', 'appetite', 'screen', 'anger',
      'indulg', 'avoid', 'obedien', 'sin', 'repent',
    ],
    dailyEmphasis: 'Choose one small act of restraint before the moment you usually give in.',
    readingLabel: 'Galatians 5',
    readingBook: 'Galatians',
    readingChapter: 5,
    verses: [
      {
        reference: 'Galatians 5:22-23',
        text: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.',
      },
      {
        reference: '1 Corinthians 9:24-27',
        text: 'Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize. Everyone who competes in the games goes into strict training.',
      },
    ],
  },
  faithfulness: {
    key: 'faithfulness',
    title: 'Faithfulness',
    description: 'A season of showing up — in devotion, relationships, and calling — when motivation fades.',
    themes: ['faithfulness', 'gratitude', 'leadership'],
    keywords: [
      'faithful', 'consisten', 'commit', 'persever', 'quit', 'discourag', 'endur',
      'show up', 'follow through', 'promise', 'steadfast',
    ],
    dailyEmphasis: 'Keep one small promise to God or another person today.',
    readingLabel: 'Lamentations 3',
    readingBook: 'Lamentations',
    readingChapter: 3,
    verses: [
      {
        reference: 'Lamentations 3:22-23',
        text: 'Because of the Lord\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
      },
      {
        reference: 'Galatians 6:9',
        text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.',
      },
    ],
  },
  gentleness: {
    key: 'gentleness',
    title: 'Gentleness',
    description: 'A season of cultivating a steady, tender spirit — especially under pressure.',
    themes: ['gentleness', 'anger', 'family'],
    keywords: [
      'harsh', 'sharp', 'tone', 'yell', 'gentle', 'soft', 'tender', 'critical',
      'sarcasm', 'bite', 'volume',
    ],
    dailyEmphasis: 'Lower your voice or soften your tone in one conversation today.',
    readingLabel: 'Proverbs 15',
    readingBook: 'Proverbs',
    readingChapter: 15,
    verses: [
      {
        reference: 'Proverbs 15:1',
        text: 'A gentle answer turns away wrath, but a harsh word stirs up anger.',
      },
      {
        reference: 'Philippians 4:5',
        text: 'Let your gentleness be evident to all. The Lord is near.',
      },
    ],
  },
  love: {
    key: 'love',
    title: 'Love',
    description: 'A season of learning to love others actively — not only in feeling, but in action.',
    themes: ['love', 'family', 'kindness'],
    keywords: [
      'love', 'selfish', 'serve', 'care', 'cold', 'distant', 'resent', 'forgive',
      'marriage', 'spouse', 'neighbor',
    ],
    dailyEmphasis: 'Look for one concrete way to love someone before they ask.',
    readingLabel: '1 Corinthians 13',
    readingBook: '1 Corinthians',
    readingChapter: 13,
    verses: [
      {
        reference: '1 Corinthians 13:4-7',
        text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.',
      },
      {
        reference: 'John 13:34-35',
        text: 'A new command I give you: Love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another.',
      },
    ],
  },
  joy: {
    key: 'joy',
    title: 'Joy',
    description: 'A season of receiving and practicing joy rooted in Christ — not circumstances alone.',
    themes: ['joy', 'gratitude', 'peace'],
    keywords: [
      'joy', 'happy', 'grateful', 'thankful', 'bless', 'delight', 'celebrate',
      'heaviness', 'sad', 'dull', 'flat',
    ],
    dailyEmphasis: 'Name one gift from God aloud before the day ends.',
    readingLabel: 'Philippians 4',
    readingBook: 'Philippians',
    readingChapter: 4,
    verses: [
      {
        reference: 'Nehemiah 8:10',
        text: 'Do not grieve, for the joy of the Lord is your strength.',
      },
      {
        reference: 'Philippians 4:4',
        text: 'Rejoice in the Lord always. I will say it again: Rejoice!',
      },
    ],
  },
  kindness: {
    key: 'kindness',
    title: 'Kindness',
    description: 'A season of practicing deliberate kindness — especially where it costs something.',
    themes: ['kindness', 'love', 'family'],
    keywords: [
      'kind', 'unkind', 'harsh', 'generous', 'compassion', 'mercy', 'help',
      'neighbor', 'coworker',
    ],
    dailyEmphasis: 'Offer one kindness you could easily skip today.',
    readingLabel: 'Ephesians 4',
    readingBook: 'Ephesians',
    readingChapter: 4,
    verses: [
      {
        reference: 'Ephesians 4:32',
        text: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.',
      },
      {
        reference: 'Colossians 3:12',
        text: 'Therefore, as God\'s chosen people, holy and dearly loved, clothe yourselves with compassion, kindness, humility, gentleness and patience.',
      },
    ],
  },
  goodness: {
    key: 'goodness',
    title: 'Goodness',
    description: 'A season of pursuing what is right and good in ordinary places — work, home, and community.',
    themes: ['faithfulness', 'gratitude', 'leadership'],
    keywords: [
      'good', 'integrity', 'honest', 'right', 'just', 'character', 'virtue',
      'hypocris', 'shortcut',
    ],
    dailyEmphasis: 'Do one hidden act of integrity no one will applaud.',
    readingLabel: 'Micah 6',
    readingBook: 'Micah',
    readingChapter: 6,
    verses: [
      {
        reference: 'Micah 6:8',
        text: 'He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.',
      },
      {
        reference: 'Romans 12:9',
        text: 'Love must be sincere. Hate what is evil; cling to what is good.',
      },
    ],
  },
  trust: {
    key: 'trust',
    title: 'Trust',
    description: 'A season of leaning on God when the path ahead is unclear or the outcome is not yours to control.',
    themes: ['trust', 'anxiety', 'faithfulness'],
    keywords: [
      'trust', 'control', 'uncertain', 'unknown', 'future', 'plan', 'surrender',
      'let go', 'faith', 'doubt',
    ],
    dailyEmphasis: 'When worry rises, speak one truth about God\'s character before problem-solving.',
    readingLabel: 'Proverbs 3',
    readingBook: 'Proverbs',
    readingChapter: 3,
    verses: [
      {
        reference: 'Proverbs 3:5-6',
        text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
      },
      {
        reference: 'Psalm 56:3',
        text: 'When I am afraid, I put my trust in you.',
      },
    ],
  },
  prayer: {
    key: 'prayer',
    title: 'Prayer',
    description: 'A season of deepening conversation with God — bringing life honestly before him.',
    themes: ['prayer', 'faithfulness', 'trust'],
    keywords: [
      'pray', 'prayer', 'quiet time', 'devotion', 'bible', 'scripture', 'word',
      'distant from god', 'dry', 'discipline',
    ],
    dailyEmphasis: 'Protect ten unhurried minutes to speak and listen with God.',
    readingLabel: '1 Thessalonians 5',
    readingBook: '1 Thessalonians',
    readingChapter: 5,
    verses: [
      {
        reference: '1 Thessalonians 5:16-18',
        text: 'Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.',
      },
      {
        reference: 'Philippians 4:6',
        text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
      },
    ],
  },
  anxiety: {
    key: 'anxiety',
    title: 'Peace',
    description: 'A season of bringing worry to God and learning to rest in his care.',
    themes: ['anxiety', 'peace', 'trust', 'prayer'],
    keywords: [
      'anxiet', 'worry', 'fear', 'panic', 'what if', 'tomorrow', 'cannot sleep',
      'overthink', 'catastroph',
    ],
    dailyEmphasis: 'When anxiety rises, pray before you plan.',
    readingLabel: 'Matthew 6',
    readingBook: 'Matthew',
    readingChapter: 6,
    verses: [
      {
        reference: 'Matthew 6:25-34',
        text: 'Therefore I tell you, do not worry about your life, what you will eat or drink; or about your body, what you will wear. Is not life more than food, and the body more than clothes?',
      },
      {
        reference: 'Philippians 4:6',
        text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
      },
    ],
  },
  family: {
    key: 'family',
    title: 'Family',
    description: 'A season of investing in the spiritual life of your home with intention and grace.',
    themes: ['family', 'love', 'patience', 'faithfulness'],
    keywords: [
      'family', 'child', 'children', 'parent', 'spouse', 'marriage', 'home',
      'husband', 'wife', 'son', 'daughter', 'household',
    ],
    dailyEmphasis: 'Bless one person in your home with presence, not only tasks.',
    readingLabel: 'Deuteronomy 6',
    readingBook: 'Deuteronomy',
    readingChapter: 6,
    verses: [
      {
        reference: 'Deuteronomy 6:6-7',
        text: 'These commandments that I give you today are to be on your hearts. Impress them on your children. Talk about them when you sit at home and when you walk along the road.',
      },
      {
        reference: 'Ephesians 6:4',
        text: 'Fathers, do not exasperate your children; instead, bring them up in the training and instruction of the Lord.',
      },
    ],
  },
  work: {
    key: 'work',
    title: 'Work',
    description: 'A season of honoring God in your labor — with integrity, diligence, and peace.',
    themes: ['faithfulness', 'leadership', 'peace'],
    keywords: [
      'work', 'job', 'career', 'office', 'boss', 'coworker', 'colleague',
      'workplace', 'deadline', 'project',
    ],
    dailyEmphasis: 'Offer today\'s work to God before you begin the first task.',
    readingLabel: 'Colossians 3',
    readingBook: 'Colossians',
    readingChapter: 3,
    verses: [
      {
        reference: 'Colossians 3:23',
        text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
      },
      {
        reference: 'Proverbs 16:3',
        text: 'Commit to the Lord whatever you do, and he will establish your plans.',
      },
    ],
  },
};

const FRUIT_TO_FOCUS: Record<string, AssessmentFocusKey> = {
  Love: 'love',
  Joy: 'joy',
  Peace: 'peace',
  Patience: 'patience',
  Kindness: 'kindness',
  Goodness: 'goodness',
  Faithfulness: 'faithfulness',
  Gentleness: 'gentleness',
  'Self-Control': 'self-control',
};

export function fruitToFocusKey(fruit: string): AssessmentFocusKey | null {
  return FRUIT_TO_FOCUS[fruit] ?? null;
}

export const MANUAL_FOCUS_OPTIONS: AssessmentFocusKey[] = [
  'patience',
  'peace',
  'self-control',
  'faithfulness',
  'gentleness',
  'love',
  'joy',
  'kindness',
  'goodness',
  'trust',
  'prayer',
  'family',
  'work',
];

const HERO_KEY_MAP: Record<AssessmentFocusKey, FocusVisualKey> = {
  patience: 'patience',
  peace: 'peace',
  'self-control': 'self-control',
  faithfulness: 'faithfulness',
  gentleness: 'default',
  love: 'default',
  joy: 'peace',
  kindness: 'default',
  goodness: 'faithfulness',
  trust: 'trust',
  prayer: 'prayer',
  anxiety: 'peace',
  family: 'faithfulness',
  work: 'courage',
};

export function getAssessmentHeroKey(key: AssessmentFocusKey): FocusVisualKey {
  return HERO_KEY_MAP[key] ?? 'default';
}

export function profileToSuggestion(
  profile: FocusProfile,
  whyFocus: string,
  verseIndex = 0,
): AssessmentSuggestion {
  const verse = profile.verses[verseIndex] ?? profile.verses[0];
  return {
    focusKey: profile.key,
    focusTitle: profile.title,
    focusDescription: profile.description,
    focusThemes: profile.themes,
    whyFocus,
    verseReference: verse.reference,
    verseText: verse.text,
    readingLabel: profile.readingLabel,
    readingBook: profile.readingBook,
    readingChapter: profile.readingChapter,
    dailyEmphasis: profile.dailyEmphasis,
  };
}
