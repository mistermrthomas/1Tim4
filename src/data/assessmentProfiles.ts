import { MEMORIZATION_TRANSLATION } from '../constants/bible';
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
        text: 'This you know, my beloved brothers and sisters. But everyone must be quick to hear, slow to speak, and slow to anger;',
      },
      {
        reference: 'Romans 12:12',
        text: 'rejoicing in hope, persevering in tribulation, devoted to prayer,',
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
        text: 'Be anxious for nothing, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all comprehension, will guard your hearts and your minds in Christ Jesus.',
      },
      {
        reference: 'John 14:27',
        text: 'Peace I leave with you; My peace I give to you; not as the world gives do I give to you. Do not let your heart be troubled, nor let it be fearful.',
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
        text: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.',
      },
      {
        reference: '1 Corinthians 9:24-27',
        text: 'Do you not know that those who run in a race all run, but only one receives the prize? Run in such a way that you may win. Everyone who competes in the games exercises self-control in all things.',
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
        text: 'The Lord\'s lovingkindnesses indeed never cease, For His compassions never fail. They are new every morning; Great is Your faithfulness.',
      },
      {
        reference: 'Galatians 6:9',
        text: 'Let us not lose heart in doing good, for in due time we will reap if we do not grow weary.',
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
        text: 'A gentle answer turns away wrath, But a harsh word stirs up anger.',
      },
      {
        reference: 'Philippians 4:5',
        text: 'Let your gentle spirit be known to all. The Lord is near.',
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
        text: 'Love is patient, love is kind and is not jealous; love does not brag and is not arrogant, does not act unbecomingly; it does not seek its own, is not provoked, does not take into account a wrong suffered,',
      },
      {
        reference: 'John 13:34-35',
        text: 'A new commandment I give to you, that you love one another, even as I have loved you, that you also love one another. By this all will know that you are My disciples, if you have love for one another.',
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
        text: 'Do not be grieved, for the joy of the Lord is your strength.',
      },
      {
        reference: 'Philippians 4:4',
        text: 'Rejoice in the Lord always; again I will say, rejoice!',
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
        text: 'Be kind to one another, tender-hearted, forgiving each other, just as God in Christ also has forgiven you.',
      },
      {
        reference: 'Colossians 3:12',
        text: 'So, as those who have been chosen of God, holy and beloved, put on a heart of compassion, kindness, humility, gentleness and patience;',
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
        text: 'He has told you, O man, what is good; And what does the Lord require of you But to do justice, to love kindness, And to walk humbly with your God?',
      },
      {
        reference: 'Romans 12:9',
        text: 'Let love be without hypocrisy. Abhor what is evil; cling to what is good.',
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
        text: 'Trust in the Lord with all your heart And do not lean on your own understanding. In all your ways acknowledge Him, And He will make your paths straight.',
      },
      {
        reference: 'Psalm 56:3',
        text: 'When I am afraid, I will put my trust in You.',
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
        text: 'Rejoice always; pray without ceasing; in everything give thanks; for this is God\'s will for you in Christ Jesus.',
      },
      {
        reference: 'Philippians 4:6',
        text: 'Be anxious for nothing, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
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
        text: 'For this reason I say to you, do not be worried about your life, as to what you will eat or what you will drink; nor for your body, as to what you will put on. Is not life more than food, and the body more than clothing?',
      },
      {
        reference: 'Philippians 4:6',
        text: 'Be anxious for nothing, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
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
        text: 'These words, which I am commanding you today, shall be on your heart. You shall teach them diligently to your sons and shall talk of them when you sit in your house and when you walk by the road and when you lie down and when you rise up.',
      },
      {
        reference: 'Ephesians 6:4',
        text: 'Fathers, do not provoke your children to anger, but bring them up in the discipline and instruction of the Lord.',
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
        text: 'Whatever you do, do your work heartily, as for the Lord rather than for men,',
      },
      {
        reference: 'Proverbs 16:3',
        text: 'Commit your works to the Lord And your plans will be established.',
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
    translation: MEMORIZATION_TRANSLATION,
  };
}
