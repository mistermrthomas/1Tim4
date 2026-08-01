import { useEffect, useState } from 'react';
import { APP_NAME } from '../brand';
import { usePhase0HealthQuery } from '../app/usePhase0HealthQuery';
import { loadFoundationPack } from '../content/bundled/loadFoundationPack';
import { resolveDailySnapshot } from '../content/runtime/resolveDailySnapshot';
import { resolveScriptureFromPack } from '../content/runtime/resolveScriptureFromPack';
import { createIndexedDbAdapter } from '../data/storage';
import { createContentPackRepository } from '../data/repositories/contentPackRepository';
import { createProfileRepository } from '../data/repositories/profileRepository';
import type { DailyContentSnapshot, InstalledContentPack } from '../content/types';
import type { ResolvedScripture } from '../domain/scripture/types';

/**
 * Dev harness for Phase 0 architecture seams — not production UI.
 * Route: /phase0
 */
export function Phase0HarnessPage() {
  const health = usePhase0HealthQuery();
  const [pack, setPack] = useState<InstalledContentPack | null>(null);
  const [snapshot, setSnapshot] = useState<DailyContentSnapshot | null>(null);
  const [scripture, setScripture] = useState<ResolvedScripture | null>(null);
  const [storageOk, setStorageOk] = useState<string>('…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadFoundationPack();
        const snap = resolveDailySnapshot({
          pack: loaded,
          focusKey: 'patience',
          stageKey: 'practice',
          morningMode: 'short',
          workoutTemplateId: 'full_body_foundations',
        });
        const verse = resolveScriptureFromPack(loaded, snap.referenceId, 'web');

        const storage = createIndexedDbAdapter();
        const profiles = createProfileRepository(storage);
        const packs = createContentPackRepository(storage);
        await profiles.save({
          id: 'phase0-harness',
          displayName: 'Phase0',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          preferredTranslationId: 'web',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await packs.installAtomic(loaded);
        const roundTrip = await packs.getInstalled(loaded.manifest.packId);

        if (cancelled) return;
        setPack(loaded);
        setSnapshot(snap);
        setScripture(verse);
        setStorageOk(roundTrip ? `IDB install OK (${roundTrip.manifest.version})` : 'IDB install failed');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '2rem auto', padding: 16 }}>
      <h1>Phase 0 harness</h1>
      <p>
        Working name via brand module: <strong>{APP_NAME}</strong> (architecture test only)
      </p>
      <section>
        <h2>TanStack Query</h2>
        <pre>{JSON.stringify(health.data ?? health.status, null, 2)}</pre>
      </section>
      <section>
        <h2>StorageAdapter (IndexedDB)</h2>
        <p>{storageOk}</p>
      </section>
      {error && (
        <section>
          <h2>Error</h2>
          <pre style={{ color: 'crimson' }}>{error}</pre>
        </section>
      )}
      {pack && (
        <section>
          <h2>Foundation pack</h2>
          <pre>
            {JSON.stringify(
              {
                packId: pack.manifest.packId,
                version: pack.manifest.version,
                templates: pack.data.workouts.templates.map((t) => t.id),
                foci: pack.data.foci.map((f) => f.id),
              },
              null,
              2,
            )}
          </pre>
        </section>
      )}
      {snapshot && (
        <section>
          <h2>Daily snapshot</h2>
          <pre>{JSON.stringify(snapshot, null, 2)}</pre>
        </section>
      )}
      {scripture && (
        <section>
          <h2>Scripture resolve</h2>
          <pre>{JSON.stringify(scripture, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
