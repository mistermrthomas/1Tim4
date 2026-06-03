import type { ReminderKind } from '../../shared/trailReminders.js';
import { REMINDER_META } from '../../shared/trailReminders.js';

export function reminderNotificationPayload(kind: ReminderKind): {
  title: string;
  body: string;
  url: string;
  tag: string;
} {
  const meta = REMINDER_META[kind];
  const day = new Date().toISOString().slice(0, 10);
  return {
    title: `Path — ${meta.shortLabel}`,
    body: meta.description,
    url: meta.path,
    tag: `path-${kind}-${day}`,
  };
}
