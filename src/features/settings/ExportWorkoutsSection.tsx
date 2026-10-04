import { useRef, useState } from 'react';
import {
  collectWorkoutExport,
  deliverWorkoutExport,
  type WorkoutExportDelivery,
} from '../../domain/workouts/exportWorkouts';
import { Button } from '../../ui/Button';

function statusMessage(delivery: WorkoutExportDelivery, count: number): string | null {
  const items = count === 1 ? '1 saved item' : `${count} saved items`;
  switch (delivery) {
    case 'shared':
      return count === 0
        ? 'Shared an empty workout export. No workout data is stored in this browser.'
        : `Shared ${items}.`;
    case 'downloaded':
      return count === 0
        ? 'Downloaded an empty workout export. No workout data is stored in this browser.'
        : `Downloaded ${items} as a JSON file.`;
    case 'copied':
      return count === 0
        ? 'Copied an empty workout export. No workout data is stored in this browser.'
        : `Copied ${items} to the clipboard.`;
    case 'cancelled':
      return null;
  }
}

export function ExportWorkoutsSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);

  const onExport = () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    // Collect and start share/download before React state updates so iOS
    // still treats this as the tap that opened the share sheet.
    const file = collectWorkoutExport();
    const pending = deliverWorkoutExport(file);
    setBusy(true);
    setStatus(null);
    setError(null);
    void pending
      .then((delivery) => {
        setStatus(statusMessage(delivery, Object.keys(file.keys).length));
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not export workouts.');
      })
      .finally(() => {
        pendingRef.current = false;
        setBusy(false);
      });
  };

  return (
    <section className="settings-page__section path-surface" aria-labelledby="export-workouts-heading">
      <h2 id="export-workouts-heading" className="settings-page__h2">
        Export workouts
      </h2>
      <p className="settings-page__help">
        Saves the workout history stored in this browser as one JSON file. On iPhone, the share
        sheet opens so you can save it to Files. Nothing on this device is changed or deleted.
      </p>
      <div className="settings-page__toolbar">
        <Button onClick={() => void onExport()} disabled={busy}>
          {busy ? 'Exporting…' : 'Export workouts'}
        </Button>
      </div>
      {status ? (
        <p className="settings-page__ok" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="settings-page__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
