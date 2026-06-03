import { createClient } from '@supabase/supabase-js';
import {
  configureWebPush,
  cors,
  getSupabaseAdmin,
  type VercelRequest,
  type VercelResponse,
} from './_lib/pushEnv.js';
import type { TrailNotificationPrefs } from '../shared/trailReminders.js';
import { hasAnyReminderEnabled } from '../shared/trailReminders.js';

interface SubscribeBody {
  profileId?: string;
  profileName?: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  reminders?: TrailNotificationPrefs;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!configureWebPush()) {
    res.status(503).json({ error: 'VAPID keys are not configured.' });
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Push storage is not configured (Supabase service role).' });
    return;
  }

  const body = (req.body ?? {}) as SubscribeBody;
  const profileId = body.profileId?.trim();
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const authKey = body.subscription?.keys?.auth?.trim();
  const reminders = body.reminders;

  if (!profileId || !endpoint || !p256dh || !authKey || !reminders) {
    res.status(400).json({ error: 'Missing profileId, subscription, or reminders.' });
    return;
  }

  if (!hasAnyReminderEnabled(reminders)) {
    const supabase = createClient(admin.url, admin.key);
    await supabase.from('path_push_subscriptions').delete().eq('endpoint', endpoint);
    res.status(200).json({ ok: true, subscribed: false });
    return;
  }

  const supabase = createClient(admin.url, admin.key);
  const { error } = await supabase.from('path_push_subscriptions').upsert(
    {
      endpoint,
      profile_id: profileId,
      profile_name: body.profileName?.trim() || 'Traveler',
      p256dh,
      auth_key: authKey,
      timezone: reminders.timezone,
      reminders,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    console.error('push-subscribe', error);
    res.status(500).json({ error: 'Could not save subscription.' });
    return;
  }

  res.status(200).json({ ok: true, subscribed: true });
}
