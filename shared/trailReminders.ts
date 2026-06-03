export type ReminderKind = 'prepare' | 'live' | 'reflect';

export interface ReminderSlot {
  enabled: boolean;
  /** 24-hour HH:mm, aligned to 15-minute steps for the server cron */
  time: string;
}

export interface TrailNotificationPrefs {
  /** Master switch — user opted in to push */
  pushEnabled: boolean;
  timezone: string;
  prepare: ReminderSlot;
  live: ReminderSlot;
  reflect: ReminderSlot;
}

export const REMINDER_META: Record<
  ReminderKind,
  { label: string; shortLabel: string; description: string; path: string; defaultTime: string }
> = {
  prepare: {
    label: 'Morning — Prepare',
    shortLabel: 'Prepare',
    description: 'Start the day on the trail',
    path: '/prepare',
    defaultTime: '07:00',
  },
  live: {
    label: 'Midday — Live',
    shortLabel: 'Live',
    description: 'Pause for a midday check-in',
    path: '/live',
    defaultTime: '12:00',
  },
  reflect: {
    label: 'Evening — Reflect',
    shortLabel: 'Reflect',
    description: 'Look back on the day',
    path: '/reflect',
    defaultTime: '20:00',
  },
};

export function defaultTrailNotificationPrefs(
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): TrailNotificationPrefs {
  return {
    pushEnabled: false,
    timezone,
    prepare: { enabled: true, time: REMINDER_META.prepare.defaultTime },
    live: { enabled: true, time: REMINDER_META.live.defaultTime },
    reflect: { enabled: false, time: REMINDER_META.reflect.defaultTime },
  };
}

export function hasAnyReminderEnabled(prefs: TrailNotificationPrefs): boolean {
  return (
    prefs.pushEnabled &&
    (prefs.prepare.enabled || prefs.live.enabled || prefs.reflect.enabled)
  );
}

/** Current clock in a timezone as HH:mm (24h). */
export function localHHMM(timeZone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export function remindersDueNow(
  prefs: TrailNotificationPrefs,
  at = new Date(),
): ReminderKind[] {
  const now = localHHMM(prefs.timezone, at);
  const due: ReminderKind[] = [];
  if (prefs.prepare.enabled && prefs.prepare.time === now) due.push('prepare');
  if (prefs.live.enabled && prefs.live.time === now) due.push('live');
  if (prefs.reflect.enabled && prefs.reflect.time === now) due.push('reflect');
  return due;
}
