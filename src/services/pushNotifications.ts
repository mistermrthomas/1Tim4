import type { TrailNotificationPrefs } from '../../shared/trailReminders';
import { hasAnyReminderEnabled } from '../../shared/trailReminders';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export type PushSupportStatus =
  | 'supported'
  | 'no_api'
  | 'no_sw'
  | 'no_push_manager'
  | 'ios_needs_install';

export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') return 'no_api';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'no_api';
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
  if (isIos && !standalone) return 'ios_needs_install';
  return 'supported';
}

export async function registerPathServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.error('Path: service worker registration failed', err);
    return null;
  }
}

async function fetchVapidPublicKey(): Promise<string | null> {
  const res = await fetch('/api/push-vapid-key');
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: string };
  return data.publicKey?.trim() ?? null;
}

export async function syncPushSubscription(
  profileId: string,
  profileName: string,
  prefs: TrailNotificationPrefs,
): Promise<{ ok: boolean; error?: string }> {
  const support = getPushSupportStatus();
  if (support !== 'supported') {
    return { ok: false, error: 'Push is not available in this browser or install mode.' };
  }

  if (!prefs.pushEnabled || !hasAnyReminderEnabled(prefs)) {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          profileName,
          subscription: existing.toJSON(),
          reminders: { ...prefs, pushEnabled: false },
        }),
      });
    }
    return { ok: true };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, error: 'Notifications are blocked for this site in system settings.' };
  }

  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      return { ok: false, error: 'Notification permission was not granted.' };
    }
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, error: 'Server push is not configured yet (VAPID keys).' };
  }

  const registration = await registerPathServiceWorker();
  if (!registration) {
    return { ok: false, error: 'Could not register the app for background notifications.' };
  }

  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const res = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      profileName,
      subscription: subscription.toJSON(),
      reminders: prefs,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? 'Could not save your reminder schedule.' };
  }

  return { ok: true };
}
