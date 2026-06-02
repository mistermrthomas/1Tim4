import type { TrainingFocus } from '../types';

export type FocusVisualKey =
  | 'patience'
  | 'peace'
  | 'faithfulness'
  | 'courage'
  | 'self-control'
  | 'trust'
  | 'prayer'
  | 'default';

export interface FocusVisualIdentity {
  key: FocusVisualKey;
  motif: string;
  sky: string;
  mid: string;
  ground: string;
  accent: string;
  accentSoft: string;
}

const IDENTITIES: Record<FocusVisualKey, FocusVisualIdentity> = {
  patience: {
    key: 'patience',
    motif: 'Long winding mountain trail',
    sky: '#c5d4ce',
    mid: '#e4ece5',
    ground: '#ede6d8',
    accent: '#6b8f71',
    accentSoft: '#4a6b50',
  },
  peace: {
    key: 'peace',
    motif: 'Calm lake at sunrise',
    sky: '#dce8e4',
    mid: '#c8ddd6',
    ground: '#e8f0ec',
    accent: '#7a9e96',
    accentSoft: '#5a8078',
  },
  faithfulness: {
    key: 'faithfulness',
    motif: 'Deep forest path',
    sky: '#b8c9b8',
    mid: '#d4e0d4',
    ground: '#dce6dc',
    accent: '#3d5a42',
    accentSoft: '#2e4534',
  },
  courage: {
    key: 'courage',
    motif: 'Summit overlook',
    sky: '#d4cfc4',
    mid: '#e8e2d6',
    ground: '#f0ebe0',
    accent: '#8b7355',
    accentSoft: '#6b5740',
  },
  'self-control': {
    key: 'self-control',
    motif: 'Rugged canyon trail',
    sky: '#e8dcc8',
    mid: '#f0e4d0',
    ground: '#f7f0e4',
    accent: '#c4785a',
    accentSoft: '#a06048',
  },
  trust: {
    key: 'trust',
    motif: 'Bridge crossing at the horizon',
    sky: '#c5d4ce',
    mid: '#dde8e4',
    ground: '#ede6d8',
    accent: '#6b8f71',
    accentSoft: '#4a6b50',
  },
  prayer: {
    key: 'prayer',
    motif: 'Quiet meadow clearing',
    sky: '#d8e4dc',
    mid: '#e8efe8',
    ground: '#f0ebe0',
    accent: '#8b7355',
    accentSoft: '#6b5740',
  },
  default: {
    key: 'default',
    motif: 'Mountain wilderness trail',
    sky: '#c5d4ce',
    mid: '#e4ece5',
    ground: '#ede6d8',
    accent: '#6b8f71',
    accentSoft: '#4a6b50',
  },
};

const TITLE_MAP: Record<string, FocusVisualKey> = {
  patience: 'patience',
  peace: 'peace',
  faithfulness: 'faithfulness',
  courage: 'courage',
  'self-control': 'self-control',
  selfcontrol: 'self-control',
  trust: 'trust',
  prayer: 'prayer',
  anxiety: 'peace',
  leadership: 'courage',
  family: 'faithfulness',
};

export function resolveFocusVisualKey(focus: TrainingFocus | null): FocusVisualKey {
  if (!focus) return 'default';
  const titleKey = focus.title.trim().toLowerCase();
  if (TITLE_MAP[titleKey]) return TITLE_MAP[titleKey];
  for (const theme of focus.themes) {
    if (theme in IDENTITIES && theme !== 'other') {
      return theme as FocusVisualKey;
    }
  }
  return 'default';
}

export function getFocusVisual(focus: TrainingFocus | null): FocusVisualIdentity {
  const key = resolveFocusVisualKey(focus);
  return IDENTITIES[key];
}
