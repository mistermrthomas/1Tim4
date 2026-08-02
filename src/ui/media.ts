/** App-wide cinematic media. Background is owned by FormationShell only. */
export const PATH_MEDIA = {
  /** Static shell background — training gym (desktop / wide). */
  appBackground: '/assets/media/path-app-bg.webp',
  appBackgroundFallback: '/assets/media/path-app-bg.jpg',
  /** Same source, tighter crop for narrow viewports. */
  appBackgroundMobile: '/assets/media/path-app-bg-mobile.webp',
  appBackgroundMobileFallback: '/assets/media/path-app-bg-mobile.jpg',
  /** Legacy aliases kept for any remaining references. */
  heroStudy: '/assets/media/path-app-bg.webp',
  scriptureDesk: '/assets/media/path-study-desk.png',
  trainDumbbells: '/assets/media/path-train-gym.png',
  trainPlates: '/assets/media/path-train-gym.png',
  atmosphere: '/assets/media/path-atmosphere.png',
} as const;
