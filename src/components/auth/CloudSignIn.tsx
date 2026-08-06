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
  } = useAuth();

  if (!isCloudConfigured) {
    return (
      <section className="cloud-sign-in card">
        <p className="eyebrow">Your account</p>
        <p className="cloud-sign-in__lead">
          Cloud sign-in is not enabled on this deployment yet. Your data still saves on this device
          only. Add Supabase keys in Vercel to enable Apple or Google login.
        </p>
      </section>
    );
  }

  if (user) {
    const email = user.email ?? 'Signed in';
    return (
      <section className="cloud-sign-in card">
        <p className="eyebrow">Your account</p>
        <p className="cloud-sign-in__signed-in">
          Signed in as <strong>{email}</strong>
        </p>
        <p className={`cloud-sign-in__status cloud-sign-in__status--${cloudSyncStatus}`}>
          {cloudSyncStatus === 'syncing' && 'Loading your account…'}
          {cloudSyncStatus === 'synced' &&
            (cloudSyncMessage ?? 'Your training saves to this account automatically.')}
          {cloudSyncStatus === 'error' && (cloudSyncMessage ?? 'Account error')}
          {cloudSyncStatus === 'idle' && 'Ready'}
        </p>
        {lastCloudSyncAt && (
          <p className="field-hint">Last updated: {new Date(lastCloudSyncAt).toLocaleString()}</p>
        )}
        <div className="cloud-sign-in__actions">
          <button type="button" className="btn btn-ghost" onClick={() => void signOutCloud()}>
            Sign out
          </button>
        </div>
        <p className="field-hint cloud-sign-in__note">
          Sermons, workouts, strength logs, and daily training stay with this account on every
          device. No sync button — just stay signed in.
        </p>
      </section>
    );
  }

  return (
    <section className="cloud-sign-in card">
      <p className="eyebrow">Your account</p>
      <p className="cloud-sign-in__lead">
        Sign in with the same Apple or Google account on every phone and computer. Your sermons,
        workouts, and daily training stay with the account — not the device.
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
