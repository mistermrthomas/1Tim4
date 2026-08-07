/**
 * Explicit markers for sample/demo records that may be cleared safely.
 * Never use these IDs for real user-authored plans going forward.
 */

export const CATALOG_SEED_VERSION = 4;

/** localStorage flag: one-time demo purge completed for this browser. */
export const DEMO_PURGE_FLAG_KEY = 'path-demo-purge-v3';

/** Known demo pack workout session ids (Patience Under Pressure / foundation). */
export const DEMO_PACK_SESSION_IDS = new Set([
  'full_body_foundations.day_a',
  'full_body_foundations.day_b',
  'full_body_foundations.day_a.session',
  'full_body_foundations.day_b.session',
]);

/** Exercise ids that formed the auto-assigned Full Body A sample. */
export const DEMO_PACK_EXERCISE_IDS = new Set([
  'bodyweight_squat',
  'push_up',
  'push-up',
  'standing_hip_hinge',
  'hip_hinge',
]);

/** Placeholder catalog rows from earlier seeds (not Michael’s library). */
export const DEMO_PLACEHOLDER_EXERCISE_IDS = new Set([
  'db_needs_weight',
  'reformer_needs_weight',
]);
