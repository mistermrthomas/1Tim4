import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import {
  buildDefaultPlanConfig,
  clearPlanConfig,
  resolvePlanConfig,
  writePlanConfig,
  type PlanConfig,
} from '../../domain/training/activePlan';
import { Button } from '../../ui/Button';
import './PlanBuilderPage.css';

export function PlanBuilderPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSeasonPack()
      .then((loaded) => {
        if (cancelled) return;
        setPack(loaded);
        setConfig(resolvePlanConfig(loaded));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="plan-builder__error">{error}</p>;
  if (!pack || !config) return <p className="plan-builder__loading">Loading plan builder…</p>;

  const update = (patch: Partial<PlanConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
  };

  const updatePhysical = (patch: Partial<PlanConfig['physical']>) => {
    setConfig((prev) =>
      prev ? { ...prev, physical: { ...prev.physical, ...patch } } : prev,
    );
    setSaved(false);
  };

  const updateFoundations = (patch: Partial<PlanConfig['physical']['foundations']>) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            physical: {
              ...prev.physical,
              foundations: { ...prev.physical.foundations, ...patch },
            },
          }
        : prev,
    );
    setSaved(false);
  };

  const updateWeek = (weekIndex: number, patch: Partial<PlanConfig['weeklyThemes'][number]>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        weeklyThemes: prev.weeklyThemes.map((w) =>
          w.weekIndex === weekIndex ? { ...w, ...patch } : w,
        ),
      };
    });
    setSaved(false);
  };

  const save = () => {
    writePlanConfig(config);
    setSaved(true);
  };

  const reset = () => {
    clearPlanConfig();
    const defaults = buildDefaultPlanConfig(pack);
    setConfig(defaults);
    setSaved(false);
  };

  return (
    <div className="plan-builder path-fade-in">
      <header className="plan-builder__hero">
        <p className="path-eyebrow">Configurability</p>
        <h1 className="path-display plan-builder__title">Manage plan</h1>
        <p className="path-body plan-builder__lede">
          Configure Biblical and Physical plans independently. Changes publish to Journey and shape
          Today’s plan — without editing code.
        </p>
      </header>

      <div className="plan-builder__toolbar">
        <Button onClick={save}>Save & activate</Button>
        <Button variant="ghost" onClick={reset}>
          Reset to pack defaults
        </Button>
        <Link className="path-btn path-btn--ghost" to="/journey">
          View active plan
        </Link>
        <Link className="path-btn path-btn--ghost" to="/today">
          Preview Today
        </Link>
        {saved ? <p className="plan-builder__saved">Plan activated</p> : null}
      </div>

      <section className="plan-builder__section path-surface">
        <h2 className="plan-builder__h2">Biblical plan — season</h2>
        <div className="plan-builder__grid">
          <label className="path-field">
            <span>Program name</span>
            <input
              value={config.programName}
              onChange={(e) => update({ programName: e.target.value })}
            />
          </label>
          <label className="path-field">
            <span>Season number</span>
            <input
              type="number"
              min={1}
              value={config.seasonNumber}
              onChange={(e) => update({ seasonNumber: Number(e.target.value) || 1 })}
            />
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Season title</span>
            <input
              value={config.seasonTitle}
              onChange={(e) => update({ seasonTitle: e.target.value })}
            />
          </label>
          <label className="path-field">
            <span>Duration (weeks)</span>
            <input
              type="number"
              min={1}
              max={12}
              value={config.durationWeeks}
              onChange={(e) => update({ durationWeeks: Number(e.target.value) || 6 })}
            />
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Primary character goal</span>
            <input
              value={config.primaryGoal}
              onChange={(e) => update({ primaryGoal: e.target.value })}
            />
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Secondary character goal</span>
            <input
              value={config.secondaryGoal}
              onChange={(e) => update({ secondaryGoal: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="plan-builder__section path-surface">
        <h2 className="plan-builder__h2">Biblical plan — weekly themes</h2>
        <div className="plan-builder__weeks">
          {config.weeklyThemes.map((week) => (
            <div key={week.weekIndex} className="plan-builder__week">
              <p className="plan-builder__week-label">Week {week.weekIndex}</p>
              <label className="path-field">
                <span>Theme</span>
                <input
                  value={week.theme}
                  onChange={(e) => updateWeek(week.weekIndex, { theme: e.target.value })}
                />
              </label>
              <label className="path-field">
                <span>Intent</span>
                <input
                  value={week.intent}
                  onChange={(e) => updateWeek(week.weekIndex, { intent: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="plan-builder__section path-surface">
        <h2 className="plan-builder__h2">Physical plan — targets & schedule</h2>
        <div className="plan-builder__grid">
          <label className="path-field plan-builder__span-2">
            <span>Primary physical goal</span>
            <input
              value={config.physical.primaryGoal}
              onChange={(e) => updatePhysical({ primaryGoal: e.target.value })}
            />
          </label>
          <label className="path-field">
            <span>Workouts per week</span>
            <input
              type="number"
              min={1}
              max={7}
              value={config.physical.workoutsPerWeek}
              onChange={(e) =>
                updatePhysical({ workoutsPerWeek: Number(e.target.value) || 3 })
              }
            />
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Workout rotation (comma-separated)</span>
            <input
              value={config.physical.rotation.join(', ')}
              onChange={(e) =>
                updatePhysical({
                  rotation: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="path-field">
            <span>Protein target (g)</span>
            <input
              type="number"
              min={0}
              value={config.physical.foundations.proteinG}
              onChange={(e) =>
                updateFoundations({ proteinG: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="path-field">
            <span>Water target (oz)</span>
            <input
              type="number"
              min={0}
              value={config.physical.foundations.waterOz}
              onChange={(e) =>
                updateFoundations({ waterOz: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Movement target</span>
            <input
              value={config.physical.foundations.movement}
              onChange={(e) => updateFoundations({ movement: e.target.value })}
            />
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Recovery target</span>
            <input
              value={config.physical.foundations.recovery}
              onChange={(e) => updateFoundations({ recovery: e.target.value })}
            />
          </label>
        </div>
      </section>

      <p className="path-body plan-builder__note">
        Workout templates and exercise defaults come from the workout tracker catalog. Biblical
        day-level Scripture and teaching still come from the season pack editors next. Physical
        targets and biblical season goals are configurable here independently.
      </p>
    </div>
  );
}
