import { useAuth } from '../../context/AuthContext';
import { Button } from '../../ui/Button';
import './CloudSyncBar.css';

/** Compact cloud sync control for the Formation shell (phones land on /today, not Guide). */
export function CloudSyncBar() {
  const {
    isCloudConfigured,
    user,
    cloudSyncStatus,
    cloudSyncMessage,
    signInWithApple,
    signInWithGoogle,
    refreshCloudSync,
  } = useAuth();

  if (!isCloudConfigured) return null;

  if (!user) {
    return (
      <section className="cloud-sync-bar path-surface" aria-label="Cloud sync">
        <p className="cloud-sync-bar__title">Sync this phone</p>
        <p className="cloud-sync-bar__body">
          Sign in with the same Apple or Google account you use on your computer to restore weekly
          plans and church notes.
        </p>
        <div className="cloud-sync-bar__actions">
          <Button onClick={() => void signInWithApple().catch((e) => alert(e.message))}>
            Apple
          </Button>
          <Button variant="ghost" onClick={() => void signInWithGoogle().catch((e) => alert(e.message))}>
            Google
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="cloud-sync-bar path-surface" aria-label="Cloud sync">
      <p className="cloud-sync-bar__title">Cloud sync</p>
      <p className="cloud-sync-bar__body">
        {cloudSyncStatus === 'syncing' && 'Syncing…'}
        {cloudSyncStatus === 'synced' && (cloudSyncMessage ?? 'Synced with your account')}
        {cloudSyncStatus === 'error' && (cloudSyncMessage ?? 'Sync failed — try again')}
        {cloudSyncStatus === 'idle' && `Signed in as ${user.email ?? 'your account'}`}
      </p>
      <div className="cloud-sync-bar__actions">
        <Button variant="ghost" onClick={() => void refreshCloudSync()} disabled={cloudSyncStatus === 'syncing'}>
          Sync now
        </Button>
      </div>
    </section>
  );
}
