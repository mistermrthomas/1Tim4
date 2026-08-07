import { useCallback, useEffect, useRef, useState } from 'react';
import type { SermonPlan } from '../../../shared/sermonPlanSchema';
import { applySermonPlanToWeeklyPlan } from '../../domain/aiPlanning/applySermonPlan';
import {
  notesAreMeaningful,
  requestSermonPlan,
  SermonPlanClientError,
} from '../../domain/aiPlanning/client';
import { readAiPlanningSettings } from '../../domain/aiPlanning/settings';
import { saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import '../weeklyPlan/WeeklyPlanWorkspace.css';

/**
 * Single-screen sermon capture on Sunday.
 * Autosaves notes to the weekly plan so they never depend on a wizard step.
 */
export function SundaySermonEditor({
  plan,
  onPlanChange,
}: {
  plan: WeeklyPlan;
  onPlanChange: (plan: WeeklyPlan) => void;
}) {
  const [local, setLocal] = useState(plan);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const latestRef = useRef(local);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocal(plan);
    latestRef.current = plan;
  }, [plan.id, plan.updatedAt]);

  useEffect(() => {
    latestRef.current = local;
  }, [local]);

  const flushSave = useCallback(async () => {
    const current = latestRef.current;
    setSaveState('saving');
    try {
      const saved = await saveWeeklyPlan(current);
      latestRef.current = saved;
      setLocal(saved);
      onPlanChange(saved);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [onPlanChange]);

  const scheduleSave = useCallback(
    (next: WeeklyPlan) => {
      setLocal(next);
      latestRef.current = next;
      setSaveState('saving');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flushSave();
      }, 450);
    },
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      // Best-effort flush on unmount
      void saveWeeklyPlan(latestRef.current).then(onPlanChange).catch(() => undefined);
    };
  }, [onPlanChange]);

  const patchChurch = (partial: Partial<WeeklyPlan['church']>) => {
    scheduleSave({
      ...latestRef.current,
      church: { ...latestRef.current.church, ...partial },
    });
  };

  const generate = async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const current = latestRef.current;
    if (!notesAreMeaningful(current.church.sermonNotes)) {
      setAiError('Add a few sentences of sermon notes before generating.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    setMessage(null);
    try {
      // Persist notes before AI so a failed generate never loses them.
      const persisted = await saveWeeklyPlan(current);
      setLocal(persisted);
      onPlanChange(persisted);
      setSaveState('saved');

      const settings = await readAiPlanningSettings();
      const result = await requestSermonPlan({
        sermonTitle: persisted.church.sermonTitle,
        sermonDate: persisted.church.sermonDate,
        sermonNotes: persisted.church.sermonNotes,
        primaryScripture: persisted.church.primaryScripture || undefined,
        sermonSpeaker: persisted.church.speaker || undefined,
        churchName: persisted.church.churchName || undefined,
        sermonUrl: persisted.church.sermonUrl || undefined,
        additionalContext: persisted.church.additionalContext || undefined,
        planningPrompt: settings.planningPrompt,
        model: settings.model,
      });
      const next = applySermonPlanToWeeklyPlan(persisted, result.plan as SermonPlan, {
        modelUsed: result.modelUsed,
        promptVersion: settings.promptVersion,
      });
      const saved = await saveWeeklyPlan(next);
      setLocal(saved);
      onPlanChange(saved);
      setMessage('Biblical plan generated. Review below, then activate when ready.');
    } catch (e) {
      if (e instanceof SermonPlanClientError) setAiError(e.message);
      else setAiError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed — retry by editing'
          : 'Edits autosave';

  return (
    <section className="sunday-biblical path-surface sunday-home__sermon" aria-label="Sermon notes">
      <div className="sunday-biblical__head">
        <p className="today-panel__label">This week’s sermon</p>
        <span className="sunday-biblical__badge">{saveLabel}</span>
      </div>
      <p className="sunday-biblical__hint">
        One screen. Paste notes here — they save automatically. Then generate the week’s Biblical
        plan.
      </p>
      <div className="weekly-plan__grid" style={{ marginTop: '0.65rem' }}>
        <label className="path-field">
          <span>Primary scripture</span>
          <input
            value={local.church.primaryScripture}
            onChange={(e) => patchChurch({ primaryScripture: e.target.value })}
            placeholder="e.g. Romans 12:1–2"
          />
        </label>
        <label className="path-field">
          <span>Sermon title — optional</span>
          <input
            value={local.church.sermonTitle}
            onChange={(e) => patchChurch({ sermonTitle: e.target.value })}
            placeholder="Leave blank for AI"
          />
        </label>
        <label className="path-field weekly-plan__span-2">
          <span>Sermon notes</span>
          <textarea
            id="sunday-sermon-notes"
            rows={10}
            value={local.church.sermonNotes}
            onChange={(e) => patchChurch({ sermonNotes: e.target.value })}
            placeholder="Paste or write anything you captured during church."
          />
        </label>
      </div>
      {aiError ? <p className="weekly-plan__error">{aiError}</p> : null}
      {message ? <p className="sunday-biblical__hint">{message}</p> : null}
      <div className="sunday-biblical__actions" style={{ marginTop: '0.75rem' }}>
        <Button
          onClick={() => void generate()}
          disabled={generating || !notesAreMeaningful(local.church.sermonNotes)}
        >
          {generating ? 'Generating…' : 'Generate Biblical plan'}
        </Button>
        <Button variant="ghost" onClick={() => void flushSave()} disabled={saveState === 'saving'}>
          Save now
        </Button>
      </div>
    </section>
  );
}
