import {
  defaultTrailNotificationPrefs,
  type TrailNotificationPrefs,
} from '../../shared/trailReminders';

const KEY_PREFIX = 'path-notification-prefs-';

export function loadNotificationPrefs(profileId: string): TrailNotificationPrefs {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${profileId}`);
    if (!raw) return defaultTrailNotificationPrefs();
    const parsed = JSON.parse(raw) as TrailNotificationPrefs;
    const defaults = defaultTrailNotificationPrefs(parsed.timezone);
    return {
      ...defaults,
      ...parsed,
      prepare: { ...defaults.prepare, ...parsed.prepare },
      live: { ...defaults.live, ...parsed.live },
      reflect: { ...defaults.reflect, ...parsed.reflect },
    };
  } catch {
    return defaultTrailNotificationPrefs();
  }
}

export function saveNotificationPrefs(
  profileId: string,
  prefs: TrailNotificationPrefs,
): void {
  localStorage.setItem(`${KEY_PREFIX}${profileId}`, JSON.stringify(prefs));
}
