import { useCallback, useEffect, useState } from 'react';
import {
  REMINDER_META,
  type ReminderKind,
  type TrailNotificationPrefs,
} from '../../../shared/trailReminders';
import { loadNotificationPrefs, saveNotificationPrefs } from '../../storage/notificationPrefs';
import {
  getPushSupportStatus,
  syncPushSubscription,
  type PushSupportStatus,
} from '../../services/pushNotifications';
import './TrailRemindersSettings.css';

const KINDS: ReminderKind[] = ['prepare', 'live', 'reflect'];

interface Props {
  profileId: string;
  profileName: string;
}

export function TrailRemindersSettings({ profileId, profileName }: Props) {
  const [prefs, setPrefs] = useState<TrailNotificationPrefs>(() =>
    loadNotificationPrefs(profileId),
  );
  const [support, setSupport] = useState<PushSupportStatus>(() => getPushSupportStatus());
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadNotificationPrefs(profileId));
    setSupport(getPushSupportStatus());
    setStatus('idle');
    setMessage(null);
  }, [profileId]);

  const persist = useCallback(
    async (next: TrailNotificationPrefs) => {
      saveNotificationPrefs(profileId, next);
      setPrefs(next);
      if (!next.pushEnabled) {
        setStatus('saved');
        setMessage('Reminders turned off on this device.');
        await syncPushSubscription(profileId, profileName, next);
        return;
      }
      setStatus('saving');
      setMessage(null);
      const result = await syncPushSubscription(profileId, profileName, next);
      if (result.ok) {
        setStatus('saved');
        setMessage('Reminders are on. You should get a nudge at the times you chose.');
      } else {
        setStatus('error');
        setMessage(result.error ?? 'Could not enable reminders.');
        setPrefs((p) => ({ ...p, pushEnabled: false }));
        saveNotificationPrefs(profileId, { ...next, pushEnabled: false });
      }
    },
    [profileId, profileName],
  );

  const updateSlot = (kind: ReminderKind, patch: Partial<TrailNotificationPrefs[typeof kind]>) => {
    const next = {
      ...prefs,
      [kind]: { ...prefs[kind], ...patch },
    };
    void persist(next);
  };

  const toggleMaster = () => {
    const next = { ...prefs, pushEnabled: !prefs.pushEnabled };
    void persist(next);
  };

  const supportNote = (() => {
    switch (support) {
      case 'ios_needs_install':
        return 'On iPhone, add Path to your Home Screen first, then enable reminders here.';
      case 'no_api':
        return 'This browser does not support push notifications.';
      default:
        return 'Works when Path is installed or open in Chrome, Edge, Firefox, or Safari (iOS 16.4+). Times use your device timezone.';
    }
  })();

  const masterDisabled = support !== 'supported';

  return (
    <section className="guide-section trail-reminders">
      <h2 className="section-title">Trail reminders</h2>
      <p className="guide-section__desc">{supportNote}</p>

      <label className="trail-reminders__master">
        <input
          type="checkbox"
          checked={prefs.pushEnabled}
          disabled={masterDisabled || status === 'saving'}
          onChange={toggleMaster}
        />
        <span>
          <strong>Enable push reminders</strong>
          <span className="field-hint">Choose which parts of the day to be nudged</span>
        </span>
      </label>

      <ul className={`trail-reminders__list${prefs.pushEnabled ? '' : ' trail-reminders__list--dim'}`}>
        {KINDS.map((kind) => {
          const meta = REMINDER_META[kind];
          const slot = prefs[kind];
          return (
            <li key={kind} className="trail-reminders__item card">
              <label className="trail-reminders__item-toggle">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  disabled={!prefs.pushEnabled || masterDisabled || status === 'saving'}
                  onChange={(e) => updateSlot(kind, { enabled: e.target.checked })}
                />
                <span>
                  <strong>{meta.label}</strong>
                  <span className="field-hint">{meta.description}</span>
                </span>
              </label>
              <div className="trail-reminders__time">
                <label className="field-label" htmlFor={`reminder-time-${kind}`}>
                  Time
                </label>
                <input
                  id={`reminder-time-${kind}`}
                  type="time"
                  step={900}
                  value={slot.time}
                  disabled={!prefs.pushEnabled || !slot.enabled || masterDisabled || status === 'saving'}
                  onChange={(e) => updateSlot(kind, { time: e.target.value })}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="field-hint trail-reminders__cron-hint">
        Reminders fire at the exact minute you pick (checked every 15 minutes on the server).
      </p>

      {status === 'saving' && (
        <p className="field-hint trail-reminders__status">Saving…</p>
      )}
      {message && (
        <p
          className={`trail-reminders__status${status === 'error' ? ' trail-reminders__status--error' : ''}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </section>
  );
}
