import { useRef, useState } from 'react';
import type { WorkoutExportFile } from '../../domain/workouts/exportWorkouts';
import {
  applyWorkoutImport,
  hasWorkoutImportBackup,
  parseWorkoutExport,
  restoreWorkoutImportBackup,
  summarizeWorkoutImport,
  WORKOUT_IMPORT_MAX_CHARS,
  type WorkoutImportSummary,
} from '../../domain/workouts/importWorkouts';
import { Button } from '../../ui/Button';

function reviewText(text: string): { file: WorkoutExportFile; summary: WorkoutImportSummary } {
  const file = parseWorkoutExport(text);
  return { file, summary: summarizeWorkoutImport(file) };
}

function resultMessage(summary: WorkoutImportSummary): string {
  const imported = summary.bags.filter((bag) => bag.present);
  if (imported.length === 0) {
    return 'That export has no workout data. Workouts already on this device were left as they are.';
  }
  const parts = imported.map((bag) => `${bag.label}: ${bag.detail}`);
  return `Imported ${parts.join(', ')}. Previous workouts are saved and can be restored.`;
}

export function ImportWorkoutsSection() {
  const busyRef = useRef(false);
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<WorkoutExportFile | null>(null);
  const [summary, setSummary] = useState<WorkoutImportSummary | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(() => {
    try {
      return hasWorkoutImportBackup();
    } catch {
      return false;
    }
  });

  const fail = (cause: unknown) => {
    setPreview(null);
    setSummary(null);
    setStatus(null);
    setError(cause instanceof Error ? cause.message : 'Could not read that workout export.');
  };

  const showReview = (text: string) => {
    try {
      const next = reviewText(text);
      setPreview(next.file);
      setSummary(next.summary);
      setError(null);
      setStatus(null);
    } catch (cause) {
      fail(cause);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file || busyRef.current) return;
    if (file.size > WORKOUT_IMPORT_MAX_CHARS) {
      fail(new Error('That workout export is too large to import. Nothing was changed.'));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    void file
      .text()
      .then((text) => {
        if (text.length <= 100_000) setDraft(text);
        else setDraft('');
        showReview(text);
      })
      .catch(() => {
        fail(new Error('Could not read that file. Nothing was changed.'));
      })
      .finally(() => {
        busyRef.current = false;
        setBusy(false);
      });
  };

  const onReadClipboard = () => {
    if (busyRef.current) return;
    const readText = navigator.clipboard?.readText;
    if (!readText) {
      fail(
        new Error(
          'This browser cannot read the clipboard. Paste the JSON into the box. Nothing was changed.',
        ),
      );
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setStatus(null);
    void readText
      .call(navigator.clipboard)
      .then((text) => {
        setDraft(text);
        showReview(text);
      })
      .catch(() => {
        fail(
          new Error(
            'Could not read the clipboard. Paste the JSON into the box. Nothing was changed.',
          ),
        );
      })
      .finally(() => {
        busyRef.current = false;
        setBusy(false);
      });
  };

  const onReviewDraft = () => {
    if (busyRef.current) return;
    showReview(draft);
  };

  const onConfirm = () => {
    if (!preview || !summary || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      applyWorkoutImport(preview);
      setStatus(resultMessage(summary));
      setPreview(null);
      setSummary(null);
      setDraft('');
      setCanUndo(hasWorkoutImportBackup());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import workouts.');
      setCanUndo(hasWorkoutImportBackup());
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const onCancel = () => {
    setPreview(null);
    setSummary(null);
    setError(null);
  };

  const onUndo = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      restoreWorkoutImportBackup();
      setStatus('Restored workouts from before the last import.');
      setPreview(null);
      setSummary(null);
      setCanUndo(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore the previous workouts.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="settings-page__section path-surface" aria-labelledby="import-workouts-heading">
      <h2 id="import-workouts-heading" className="settings-page__h2">
        Import workouts
      </h2>
      <p className="settings-page__help">
        Brings back a workout export from the other Path address. Choose the JSON file, or paste it
        if the export was copied. On iPhone, the file picker opens Files. Nothing is replaced until
        you review the counts and confirm.
      </p>
      <div className="settings-page__toolbar">
        <label className="path-btn path-btn--primary settings-page__file-label">
          Choose file
          <input
            type="file"
            accept="application/json,.json,text/json,text/plain"
            className="settings-page__file"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              onFile(file);
            }}
          />
        </label>
        <Button variant="ghost" onClick={onReadClipboard} disabled={busy}>
          Paste from clipboard
        </Button>
      </div>
      <label className="path-field">
        <span>Or paste the JSON</span>
        <textarea
          className="settings-page__import"
          rows={6}
          value={draft}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          placeholder="Paste the workout JSON here"
          onChange={(event) => {
            setDraft(event.target.value);
            setPreview(null);
            setSummary(null);
          }}
        />
      </label>
      <div className="settings-page__toolbar">
        <Button variant="ghost" onClick={onReviewDraft} disabled={busy || draft.trim() === ''}>
          Review pasted JSON
        </Button>
      </div>
      {summary ? (
        <div className="settings-page__import-preview">
          <p className="settings-page__help">
            {summary.replacedKeyCount === 0
              ? 'This export has no workout data. Confirming will leave this device as it is.'
              : `${summary.replacedKeyCount === 1 ? '1 saved item' : `${summary.replacedKeyCount} saved items`} will replace matching data on this device. Current values are backed up first.`}
          </p>
          <ul className="settings-page__import-list">
            {summary.bags.map((bag) => (
              <li key={bag.key} className="settings-page__import-row">
                <span>{bag.label}</span>
                <span>{bag.detail}</span>
              </li>
            ))}
          </ul>
          <div className="settings-page__toolbar">
            <Button onClick={onConfirm} disabled={busy}>
              {busy
                ? 'Importing…'
                : summary.replacedKeyCount === 0
                  ? 'Keep current workouts'
                  : 'Replace saved workouts'}
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
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
      {canUndo ? (
        <div className="settings-page__toolbar">
          <Button variant="ghost" onClick={onUndo} disabled={busy}>
            Restore previous workouts
          </Button>
        </div>
      ) : null}
    </section>
  );
}
