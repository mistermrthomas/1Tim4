import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import {
  configureWebPush,
  getSupabaseAdmin,
  isCronAuthorized,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/pushEnv.js';
import { reminderNotificationPayload } from '../_lib/reminderPayload.js';
import {
  remindersDueNow,
  type ReminderKind,
  type TrailNotificationPrefs,
} from '../../shared/trailReminders.js';

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
  timezone: string;
  reminders: TrailNotificationPrefs;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isCronAuthorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!configureWebPush()) {
    res.status(503).json({ error: 'VAPID keys are not configured.' });
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Push storage is not configured.' });
    return;
  }

  const supabase = createClient(admin.url, admin.key);
  const { data: rows, error } = await supabase.from('path_push_subscriptions').select('*');

  if (error) {
    console.error('cron/reminders fetch', error);
    res.status(500).json({ error: 'Could not load subscriptions.' });
    return;
  }

  let sent = 0;
  let removed = 0;
  const now = new Date();

  for (const row of (rows ?? []) as SubscriptionRow[]) {
    const prefs = row.reminders;
    if (!prefs?.pushEnabled) continue;

    const due = remindersDueNow(prefs, now);
    if (due.length === 0) continue;

    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth_key },
    };

    for (const kind of due) {
      const payload = reminderNotificationPayload(kind);
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        );
        sent += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('path_push_subscriptions').delete().eq('endpoint', row.endpoint);
          removed += 1;
        } else {
          console.error('cron/reminders send', kind, err);
        }
      }
    }
  }

  res.status(200).json({
    ok: true,
    checked: rows?.length ?? 0,
    sent,
    removed,
    at: now.toISOString(),
  });
}
