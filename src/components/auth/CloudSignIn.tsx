import { useAuth } from '../../context/AuthContext';
import './CloudSignIn.css';

export function CloudSignIn() {
  const {
    isCloudConfigured,
    user,
    cloudSyncStatus,
    cloudSyncMessage,
    lastCloudSyncAt,
    signInWithApple,
    signInWithGoogle,
    signOutCloud,
    refreshCloudSync,
  } = useAuth();

  if (!isCloudConfigured) {
    return (
      <section className="cloud-sign-in card">
        <p className="eyebrow">Sync across devices</p>
        <p className="cloud-sign-in__lead">
          Cloud sign-in is not enabled on this deployment yet. Your trail still saves automatically
          on this device. Add Supabase keys in Vercel to enable Apple or Google login.
        </p>
      </section>
    );
  }

  if (user) {
    const email = user.email ?? 'Signed in';
    return (
      <section className="cloud-sign-in card">
        <p className="eyebrow">Cloud sync</p>
        <p className="cloud-sign-in__signed-in">
          Signed in as <strong>{email}</strong>
        </p>
        <p className={`cloud-sign-in__status cloud-sign-in__status--${cloudSyncStatus}`}>
          {cloudSyncStatus === 'syncing' && 'Syncing your trail…'}
          {cloudSyncStatus === 'synced' && (cloudSyncMessage ?? 'Synced')}
          {cloudSyncStatus === 'error' && (cloudSyncMessage ?? 'Sync error')}
          {cloudSyncStatus === 'idle' && 'Ready to sync'}
        </p>
        {lastCloudSyncAt && (
          <p className="field-hint">Last sync: {new Date(lastCloudSyncAt).toLocaleString()}</p>
        )}
        <div className="cloud-sign-in__actions">
          <button type="button" className="btn btn-secondary" onClick={() => void refreshCloudSync()}>
            Sync now
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void signOutCloud()}>
            Sign out of cloud
          </button>
        </div>
        <p className="field-hint cloud-sign-in__note">
          Your journal saves on this device first, then backs up to your account. Use <strong>Sync now</strong> before
          switching devices if you just dictated entries.
        </p>
      </section>
    );
  }

  return (
    <section className="cloud-sign-in card">
      <p className="eyebrow">Sync across devices</p>
      <p className="cloud-sign-in__lead">
        Sign in to back up and restore your trail on a new phone or browser. Your data stays private
        to your account. This device still works offline until you sign in.
      </p>
      <div className="cloud-sign-in__actions">
        <button
          type="button"
          className="btn btn-primary cloud-sign-in__apple"
          onClick={() => void signInWithApple().catch((e) => alert(e.message))}
        >
          Sign in with Apple
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void signInWithGoogle().catch((e) => alert(e.message))}
        >
          Sign in with Google
        </button>
      </div>
      <p className="field-hint cloud-sign-in__note">
        Recommended on iPhone: Apple. Google works well on any device.
      </p>
    </section>
  );
}
