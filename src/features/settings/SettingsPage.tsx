import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AllowedSermonPlanModel, AllowedTrainingPlanModel } from '../../../shared/aiModels';
import { DEFAULT_SERMON_PLAN_MODEL, DEFAULT_TRAINING_PLAN_MODEL } from '../../../shared/aiModels';
import { testAiConnection } from '../../domain/aiPlanning/client';
import {
  ALLOWED_SERMON_PLAN_MODELS,
  DEFAULT_PLANNING_PROMPT,
  isPromptModified,
  readAiPlanningSettings,
  resetAiPlanningPrompt,
  writeAiPlanningSettings,
  type AiPlanningSettings,
} from '../../domain/aiPlanning/settings';
import {
  ALLOWED_TRAINING_PLAN_MODELS,
  DEFAULT_TRAINING_PROMPT,
  isTrainingPromptModified,
  readAiTrainingSettings,
  resetAiTrainingPrompt,
  writeAiTrainingSettings,
  type AiTrainingSettings,
} from '../../domain/aiTraining/settings';
import { CloudSignIn } from '../../components/auth/CloudSignIn';
import { Button } from '../../ui/Button';
import './SettingsPage.css';

export function SettingsPage() {
  const [sermon, setSermon] = useState<AiPlanningSettings | null>(null);
  const [training, setTraining] = useState<AiTrainingSettings | null>(null);
  const [draftSermonPrompt, setDraftSermonPrompt] = useState('');
  const [draftSermonModel, setDraftSermonModel] =
    useState<AllowedSermonPlanModel>(DEFAULT_SERMON_PLAN_MODEL);
  const [draftTrainingPrompt, setDraftTrainingPrompt] = useState('');
  const [draftTrainingModel, setDraftTrainingModel] =
    useState<AllowedTrainingPlanModel>(DEFAULT_TRAINING_PLAN_MODEL);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [savingSermon, setSavingSermon] = useState(false);
  const [savingTraining, setSavingTraining] = useState(false);

  useEffect(() => {
    void Promise.all([readAiPlanningSettings(), readAiTrainingSettings()]).then(([s, t]) => {
      setSermon(s);
      setDraftSermonPrompt(s.planningPrompt);
      setDraftSermonModel(s.model);
      setTraining(t);
      setDraftTrainingPrompt(t.planningPrompt);
      setDraftTrainingModel(t.model);
    });
  }, []);

  if (!sermon || !training) {
    return <p className="settings-page__loading">Loading settings…</p>;
  }

  const sermonDirty =
    draftSermonPrompt !== sermon.planningPrompt || draftSermonModel !== sermon.model;
  const trainingDirty =
    draftTrainingPrompt !== training.planningPrompt || draftTrainingModel !== training.model;

  const saveSermon = async () => {
    setSavingSermon(true);
    setError(null);
    try {
      const next = await writeAiPlanningSettings({
        planningPrompt: draftSermonPrompt,
        model: draftSermonModel,
      });
      setSermon(next);
      setMessage('Biblical AI planning saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingSermon(false);
    }
  };

  const saveTraining = async () => {
    setSavingTraining(true);
    setError(null);
    try {
      const next = await writeAiTrainingSettings({
        planningPrompt: draftTrainingPrompt,
        model: draftTrainingModel,
      });
      setTraining(next);
      setMessage('Training AI planning saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingTraining(false);
    }
  };

  const resetSermon = async () => {
    if (isPromptModified({ ...sermon, planningPrompt: draftSermonPrompt })) {
      if (!window.confirm('Reset the Biblical planning prompt to the Path default?')) return;
    }
    const next = await resetAiPlanningPrompt();
    setSermon(next);
    setDraftSermonPrompt(next.planningPrompt);
    setMessage('Biblical prompt reset to default');
  };

  const resetTraining = async () => {
    if (isTrainingPromptModified({ ...training, planningPrompt: draftTrainingPrompt })) {
      if (!window.confirm('Reset the training planning prompt to the Path default?')) return;
    }
    const next = await resetAiTrainingPrompt();
    setTraining(next);
    setDraftTrainingPrompt(next.planningPrompt);
    setMessage('Training prompt reset to default');
  };

  const testConnection = async () => {
    setTesting(true);
    setError(null);
    setMessage(null);
    const result = await testAiConnection();
    setTesting(false);
    if (result.status === 'connected') {
      const via = result.via === 'vercel-ai-gateway' ? ' · Vercel AI Gateway' : '';
      setMessage(`Connected${result.model ? ` · ${result.model}` : ''}${via}`);
      return;
    }
    if (result.status === 'missing_configuration') {
      setError(
        'AI has not been configured. Add OPENAI_API_KEY (sk-… or vck-…) to the server environment.',
      );
      return;
    }
    setError('Connection failed. Confirm OPENAI_API_KEY on Vercel, then redeploy.');
  };

  return (
    <div className="settings-page path-fade-in">
      <header className="settings-page__hero">
        <p className="path-eyebrow">Preferences</p>
        <h1 className="path-display settings-page__title">Settings</h1>
        <p className="path-body">
          Sign in to sync across devices, then configure AI coaching. API keys stay on the server
          only.
        </p>
      </header>

      <section className="settings-page__section path-surface settings-page__cloud">
        <CloudSignIn />
      </section>

      <section className="settings-page__section path-surface">
        <h2 className="settings-page__h2">AI Biblical planning</h2>
        <p className="settings-page__help">
          This prompt controls how Path turns sermon notes into a weekly Biblical plan. Sermon notes
          and weekly information are added automatically when a plan is generated.
        </p>

        <label className="path-field">
          <span>Planning prompt</span>
          <textarea
            className="settings-page__prompt"
            rows={12}
            value={draftSermonPrompt}
            onChange={(e) => {
              setDraftSermonPrompt(e.target.value);
              setMessage(null);
            }}
          />
        </label>

        <label className="path-field">
          <span>Model</span>
          <select
            value={draftSermonModel}
            onChange={(e) => {
              setDraftSermonModel(e.target.value as AllowedSermonPlanModel);
              setMessage(null);
            }}
          >
            {ALLOWED_SERMON_PLAN_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <p className="settings-page__meta">
          Prompt version: {sermon.promptVersion}
          {draftSermonPrompt.trim() === DEFAULT_PLANNING_PROMPT.trim()
            ? ' · default'
            : ' · customized'}
        </p>

        <div className="settings-page__toolbar">
          <Button onClick={() => void saveSermon()} disabled={savingSermon || !sermonDirty}>
            Save Biblical Prompt
          </Button>
          <Button variant="ghost" onClick={() => void resetSermon()}>
            Reset to Default
          </Button>
        </div>
      </section>

      <section className="settings-page__section path-surface">
        <h2 className="settings-page__h2">AI training planning</h2>
        <p className="settings-page__help">
          This prompt controls how Path uses your goals, workout history, available equipment,
          exercise catalog, and weekly constraints to build a training plan.
        </p>

        <label className="path-field">
          <span>AI Training Planning Prompt</span>
          <textarea
            className="settings-page__prompt"
            rows={14}
            value={draftTrainingPrompt}
            onChange={(e) => {
              setDraftTrainingPrompt(e.target.value);
              setMessage(null);
            }}
          />
        </label>

        <label className="path-field">
          <span>Model</span>
          <select
            value={draftTrainingModel}
            onChange={(e) => {
              setDraftTrainingModel(e.target.value as AllowedTrainingPlanModel);
              setMessage(null);
            }}
          >
            {ALLOWED_TRAINING_PLAN_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <p className="settings-page__meta">
          Prompt version: {training.promptVersion}
          {draftTrainingPrompt.trim() === DEFAULT_TRAINING_PROMPT.trim()
            ? ' · default'
            : ' · customized'}
        </p>

        <div className="settings-page__toolbar">
          <Button onClick={() => void saveTraining()} disabled={savingTraining || !trainingDirty}>
            Save Training Prompt
          </Button>
          <Button variant="ghost" onClick={() => void resetTraining()}>
            Reset to Default
          </Button>
          <Button variant="ghost" onClick={() => void testConnection()} disabled={testing}>
            {testing ? 'Testing…' : 'Test AI Connection'}
          </Button>
          <Link className="path-btn path-btn--ghost" to="/sermon">
            Sunday Sermon
          </Link>
        </div>

        {message ? <p className="settings-page__ok">{message}</p> : null}
        {error ? <p className="settings-page__error">{error}</p> : null}
      </section>
    </div>
  );
}
