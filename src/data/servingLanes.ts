import type { ServingLaneKey } from '../types';

export interface ServingLaneProfile {
  key: ServingLaneKey;
  title: string;
  tagline: string;
  keywords: string[];
  summary: string;
  examples: string[];
}

export const SERVING_LANES: Record<ServingLaneKey, ServingLaneProfile> = {
  encouraging: {
    key: 'encouraging',
    title: 'Personal encouragement',
    tagline: 'Listening, presence, and steady support',
    keywords: [
      'listen', 'encourag', 'comfort', 'grief', 'care', 'check in', 'call', 'text',
      'walk alongside', 'pray with', 'hospital', 'hard season', 'empath',
    ],
    summary:
      'You tend to do your best work in direct, personal moments — hearing someone, responding with care, and helping them feel less alone.',
    examples: [
      'Checking in on someone going through a hard week',
      'Walking with a friend through a decision',
      'Sending thoughtful notes when life is heavy',
    ],
  },
  practical: {
    key: 'practical',
    title: 'Hands-on help',
    tagline: 'Fixing, building, and doing what needs doing',
    keywords: [
      'fix', 'repair', 'build', 'cook', 'meal', 'clean', 'yard', 'move', 'drive',
      'hands', 'tool', 'project', 'setup', 'deliver', 'physical', 'lawn', 'car',
    ],
    summary:
      'You often show love by doing tangible work — showing up with skills, sweat, and follow-through when something practical needs to happen.',
    examples: [
      'Helping a family move or handle a home project',
      'Preparing meals when someone is overwhelmed',
      'Fixing or building something others cannot get to',
    ],
  },
  organize: {
    key: 'organize',
    title: 'Coordination & planning',
    tagline: 'Details, schedules, and making things run',
    keywords: [
      'organiz', 'plan', 'coordinate', 'schedule', 'detail', 'email', 'spreadsheet',
      'logistics', 'admin', 'process', 'checklist', 'event', 'signup', 'calendar',
    ],
    summary:
      'You bring order to chaos — planning steps, tracking details, and helping groups actually execute what they intended to do.',
    examples: [
      'Coordinating volunteers for an event',
      'Creating systems so a team does not drop balls',
      'Managing schedules, supplies, or communication',
    ],
  },
  teach: {
    key: 'teach',
    title: 'Teaching & explaining',
    tagline: 'Clarity, patience, and helping others learn',
    keywords: [
      'teach', 'explain', 'tutor', 'train', 'clarity', 'lesson', 'coach', 'instruct',
      'break down', 'study', 'guide', 'answer questions', 'mentor skill',
    ],
    summary:
      'You help people understand — breaking ideas down, answering questions, and helping others grow in skill or confidence.',
    examples: [
      'Teaching a skill someone is trying to learn',
      'Leading a small study or discussion with preparation',
      'Training a new volunteer on how something works',
    ],
  },
  creative: {
    key: 'creative',
    title: 'Creative contribution',
    tagline: 'Writing, design, media, and artistic work',
    keywords: [
      'write', 'design', 'photo', 'video', 'music', 'art', 'creative', 'graphic',
      'story', 'edit', 'brand', 'social', 'content', 'present', 'visual',
    ],
    summary:
      'You contribute through craft and creativity — shaping messages, visuals, or experiences that help others connect and understand.',
    examples: [
      'Designing materials for an event or ministry',
      'Writing stories, devotions, or communication',
      'Photography, video, or music that serves a larger purpose',
    ],
  },
  hospitality: {
    key: 'hospitality',
    title: 'Hospitality & welcome',
    tagline: 'Making people feel seen and at home',
    keywords: [
      'host', 'welcome', 'greet', 'coffee', 'food', 'table', 'gather', 'invite',
      'hospitality', 'open home', 'party', 'meal train', 'friendly', 'warm',
    ],
    summary:
      'You create spaces where people belong — greeting, hosting, feeding, and lowering the social friction for others to connect.',
    examples: [
      'Hosting meals or gatherings in your home',
      'Greeting newcomers and helping them find their footing',
      'Organizing food or welcome for families in transition',
    ],
  },
  support: {
    key: 'support',
    title: 'Behind-the-scenes support',
    tagline: 'Reliable backup without needing the spotlight',
    keywords: [
      'behind', 'background', 'support', 'assist', 'help without', 'quiet',
      'supply', 'prep', 'setup', 'tear down', 'unsung', 'faithful', 'steady',
    ],
    summary:
      'You are most productive when you strengthen the work of others — handling the unseen tasks that let the visible work succeed.',
    examples: [
      'Prepping materials before others lead',
      'Handling logistics so leaders can focus on people',
      'Being the dependable person who always shows up',
    ],
  },
  mentor: {
    key: 'mentor',
    title: 'Mentoring & guiding',
    tagline: 'Investing in younger or newer people',
    keywords: [
      'mentor', 'young', 'youth', 'teen', 'student', 'disciple', 'guide', 'parent',
      'coach life', 'model', 'next generation', 'kids', 'children',
    ],
    summary:
      'You invest in people who are earlier on the path — offering guidance, consistency, and example over time.',
    examples: [
      'Mentoring a student or younger coworker',
      'Investing in kids or teens with steady presence',
      'Walking with someone new in faith or work',
    ],
  },
  lead: {
    key: 'lead',
    title: 'Leadership & direction',
    tagline: 'Decision-making, vision, and responsibility',
    keywords: [
      'lead', 'chair', 'direct', 'decide', 'strategy', 'vision', 'oversee',
      'manage', 'responsible', 'initiative', 'found', 'start', 'captain',
    ],
    summary:
      'You help groups move — setting direction, making calls, and carrying responsibility when others prefer not to steer.',
    examples: [
      'Leading a team or initiative with clear direction',
      'Making decisions when a group is stuck',
      'Starting something new that others can join',
    ],
  },
};

export const SERVING_LANE_KEYS = Object.keys(SERVING_LANES) as ServingLaneKey[];
