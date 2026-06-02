import type { FocusVisualKey } from '../../utils/focusVisuals';

/** Curated Path illustration library — swap assets without changing components */
const BASE = '/assets/illustrations';

export const heroArtwork: Record<FocusVisualKey, string> = {
  patience: `${BASE}/hero-patience.png`,
  peace: `${BASE}/hero-peace.png`,
  faithfulness: `${BASE}/hero-faithfulness.png`,
  courage: `${BASE}/hero-courage.png`,
  'self-control': `${BASE}/hero-self-control.png`,
  trust: `${BASE}/hero-trust.png`,
  prayer: `${BASE}/hero-default.png`,
  default: `${BASE}/hero-default.png`,
};

export const fieldGuideAssets = {
  compassRose: `${BASE}/compass-rose.png`,
  topoPattern: `${BASE}/topo-lines.svg`,
  trailMarker: `${BASE}/trail-marker.svg`,
  marginFlourish: `${BASE}/margin-flourish.svg`,
  parkIconTree: `${BASE}/icon-tree.svg`,
  parkIconPeak: `${BASE}/icon-peak.svg`,
  welcomeHero: `${BASE}/hero-default.png`,
} as const;

export function getHeroArtwork(key: FocusVisualKey): string {
  return heroArtwork[key] ?? heroArtwork.default;
}
