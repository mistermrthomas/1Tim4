import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { testAiConnection } from '../../domain/aiPlanning/client';
import type { AllowedSermonPlanModel } from '../../../shared/aiModels';
import { DEFAULT_SERMON_PLAN_MODEL } from '../../../shared/aiModels';
import {
  ALLOWED_SERMON_PLAN_MODELS,
  DEFAULT_PLANNING_PROMPT,
  isPromptModified,
  readAiPlanningSettings,
  resetAiPlanningPrompt,
  writeAiPlanningSettings,
  type AiPlanningSettings,
} from '../../domain/aiPlanning/settings';
import { Button } from '../../ui/Button';
import './SettingsPage.css';

export function SettingsPage() {
  const [settings, setSettings] = useState<AiPlanningSettings | null>(null);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftModel, setDraftModel] = useState<AllowedSermonPlanModel>(DEFAULT_SERMON_PLAN_MODEL);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void readAiPlanningSettings().then((s) => {
      setSettings(s);
      setDraftPrompt(s.planningPrompt);
      setDraftModel(s.model);
    });
  }, []);

  if (!settings) {
    return <p className="settings-page__loading">Loading settings…</p>;
  }

  const dirty =
    draftPrompt !== settings.planningPrompt || draftModel !== settings.model;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await writeAiPlanningSettings({
        planningPrompt: draftPrompt,
        model: draftModel,
      });
      setSettings(next);
      setMessage('Saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (isPromptModified({ ...settings, planningPrompt: draftPrompt })) {
      if (!window.confirm('Reset the planning prompt to the Path default? Your edits will be lost.')) {
        return;
      }
    }
    const next = await resetAiPlanningPrompt();
    setSettings(next);
    setDraftPrompt(next.planningPrompt);
    setMessage('Prompt reset to default');
  };

  const testConnection = async () => {
    setTesting(true);
    setError(null);
    setMessage(null);
    const result = await testAiConnection();
    setTesting(false);
    if (result.status === 'connected') {
      setMessage(`Connected${result.model ? ` · ${result.model}` : ''}`);
      return;
    }
    if (result.status === 'missing_configuration') {
      setError(
        'AI planning has not been configured. Add OPENAI_API_KEY to the server environment. You can still build the week manually.',
      );
      return;
    }
    setError('Connection failed. Check the server configuration and try again.');
  };

  return (
    <div className="settings-page path-fade-in">
      <header className="settings-page__hero">
        <p className="path-eyebrow">Preferences</p>
        <h1 className="path-display settings-page__title">Settings</h1>
        <p className="path-body">
          Configure how Path turns sermon notes into a weekly biblical plan. API keys stay on the
          server only.
        </p>
      </header>

      <section className="settings-page__section path-surface">
        <h2 className="settings-page__h2">AI planning</h2>
        <p className="settings-page__help">
          This prompt controls how Path turns sermon notes into a weekly biblical plan. Sermon notes
          and weekly information are added automatically when a plan is generated.
        </p>

        <label className="path-field">
          <span>Planning prompt</span>
          <textarea
            className="settings-page__prompt"
            rows={16}
            value={draftPrompt}
            onChange={(e) => {
              setDraftPrompt(e.target.value);
              setMessage(null);
            }}
          />
        </label>

        <label className="path-field">
          <span>Model</span>
          <select
            value={draftModel}
            onChange={(e) => {
              setDraftModel(e.target.value as typeof draftModel);
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
          Prompt version: {settings.promptVersion}
          {draftPrompt.trim() === DEFAULT_PLANNING_PROMPT.trim() ? ' · default' : ' · customized'}
          {settings.updatedAt ? ` · updated ${new Date(settings.updatedAt).toLocaleString()}` : ''}
        </p>

        <div className="settings-page__toolbar">
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            Save Changes
          </Button>
          <Button variant="ghost" onClick={() => void reset()}>
            Reset to Default
          </Button>
          <Button variant="ghost" onClick={() => void testConnection()} disabled={testing}>
            {testing ? 'Testing…' : 'Test AI Connection'}
          </Button>
          <Link className="path-btn path-btn--ghost" to="/plan/week">
            Weekly plan
          </Link>
        </div>

        {message ? <p className="settings-page__ok">{message}</p> : null}
        {error ? <p className="settings-page__error">{error}</p> : null}
      </section>
    </div>
  );
}
