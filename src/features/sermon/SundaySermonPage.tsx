import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  buildWeekFromSermon,
  lastSermonDefaults,
  mostRecentSunday,
  type SermonFormInput,
} from '../../domain/sermon/buildWeek';
import { notesAreMeaningful } from '../../domain/aiPlanning/client';
import { ensureWeeklyPlan } from '../../domain/weeklyPlan/store';
import { startOfWeekSunday } from '../../domain/calendar/week';
import { Button } from '../../ui/Button';
import './SundaySermonPage.css';

const EMPTY: SermonFormInput = {
  sermonDate: mostRecentSunday(),
  title: '',
  notes: '',
  primaryScripture: '',
  speaker: '',
  church: '',
  sermonLink: '',
};

export function SundaySermonPage() {
  const navigate = useNavigate();
  const { cloudDataEpoch } = useAuth();
  const [form, setForm] = useState<SermonFormInput>(EMPTY);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesSavedOnError, setNotesSavedOnError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sunday = mostRecentSunday();
        const weekStart = startOfWeekSunday(new Date(`${sunday}T12:00:00`));
        const [plan, defaults] = await Promise.all([
          ensureWeeklyPlan(weekStart),
          lastSermonDefaults(),
        ]);
        if (cancelled) return;
        setForm({
          sermonDate: plan.church.sermonDate || sunday,
          title: plan.church.sermonTitle,
          notes: plan.church.sermonNotes,
          primaryScripture: plan.church.primaryScripture,
          speaker: plan.church.speaker || defaults.speaker,
          church: plan.church.churchName || defaults.church,
          sermonLink: plan.church.sermonUrl,
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudDataEpoch]);

  const patch = (partial: Partial<SermonFormInput>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setError(null);
    setNotesSavedOnError(false);
  };

  const build = async () => {
    setBuilding(true);
    setError(null);
    setNotesSavedOnError(false);
    const result = await buildWeekFromSermon(form);
    setBuilding(false);

    if (result.ok) {
      navigate('/today', { replace: true, state: { sermonReady: true } });
      return;
    }

    if (result.sermonSaved) {
      setForm({
        ...form,
        title: result.sermon.title || form.title,
        notes: result.sermon.notes,
      });
      setNotesSavedOnError(true);
      setError(
        result.error
          ? `Your sermon notes were saved, but the weekly training could not be generated. ${result.error}`
          : 'Your sermon notes were saved, but the weekly training could not be generated. Try again.',
      );
      return;
    }

    setError(result.error);
  };

  if (!ready) {
    return (
      <div className="sunday-sermon path-fade-in">
        <p className="today-preview__loading">Preparing sermon entry…</p>
      </div>
    );
  }

  return (
    <div className="sunday-sermon path-fade-in">
      <header className="sunday-sermon__header">
        <p className="path-eyebrow">Sunday Sermon</p>
        <h1 className="path-display sunday-sermon__title">Sunday Sermon</h1>
        <p className="sunday-sermon__lede">
          Enter your sermon notes. PATH will build your biblical training for the week.
        </p>
      </header>

      <form
        className="sunday-sermon__form path-surface"
        onSubmit={(e) => {
          e.preventDefault();
          void build();
        }}
      >
        <label className="path-field sunday-sermon__notes-field">
          <span>Sermon Notes</span>
          <textarea
            className="sunday-sermon__notes"
            rows={14}
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Paste or type your sermon notes here."
            required
            autoFocus
          />
        </label>

        <details
          className="sunday-sermon__details"
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary>Optional details</summary>
          <div className="sunday-sermon__details-grid">
            <label className="path-field">
              <span>Sermon date</span>
              <input
                type="date"
                value={form.sermonDate}
                onChange={(e) => patch({ sermonDate: e.target.value })}
              />
            </label>
            <label className="path-field">
              <span>Sermon title</span>
              <input
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Leave blank — PATH can title it"
              />
            </label>
            <label className="path-field">
              <span>Primary Scripture</span>
              <input
                value={form.primaryScripture}
                onChange={(e) => patch({ primaryScripture: e.target.value })}
                placeholder="Inferred from notes when blank"
              />
            </label>
            <label className="path-field">
              <span>Speaker</span>
              <input
                value={form.speaker}
                onChange={(e) => patch({ speaker: e.target.value })}
              />
            </label>
            <label className="path-field">
              <span>Church</span>
              <input
                value={form.church}
                onChange={(e) => patch({ church: e.target.value })}
              />
            </label>
            <label className="path-field sunday-sermon__span-2">
              <span>Sermon link</span>
              <input
                type="url"
                value={form.sermonLink}
                onChange={(e) => patch({ sermonLink: e.target.value })}
                placeholder="https://"
              />
            </label>
          </div>
        </details>

        {error ? <p className="sunday-sermon__error">{error}</p> : null}

        <Button
          type="submit"
          className="sunday-sermon__build"
          disabled={building || !notesAreMeaningful(form.notes)}
        >
          {building ? 'Building…' : 'Build This Week’s Training'}
        </Button>

        {notesSavedOnError ? (
          <button
            type="button"
            className="path-btn path-btn--ghost sunday-sermon__retry"
            disabled={building}
            onClick={() => void build()}
          >
            Try again
          </button>
        ) : null}
      </form>
    </div>
  );
}
