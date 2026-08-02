import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import {
  readPhysicalPlan,
  resetPhysicalPlan,
  writePhysicalPlan,
  type CatalogTemplate,
  type PhysicalPlanCatalog,
} from '../../domain/physical/planCatalog';
import { newId } from '../../domain/physical/store';
import type { ResistanceUnit } from '../../domain/physical/types';
import {
  buildDefaultPlanConfig,
  clearPlanConfig,
  resolvePlanConfig,
  writePlanConfig,
  type PlanConfig,
} from '../../domain/training/activePlan';
import { Button } from '../../ui/Button';
import './PlanBuilderPage.css';

const WEEKDAYS = [
  { key: '0', label: 'Sunday' },
  { key: '1', label: 'Monday' },
  { key: '2', label: 'Tuesday' },
  { key: '3', label: 'Wednesday' },
  { key: '4', label: 'Thursday' },
  { key: '5', label: 'Friday' },
  { key: '6', label: 'Saturday' },
];

export function PlanBuilderPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [physicalPlan, setPhysicalPlan] = useState<PhysicalPlanCatalog | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSeasonPack()
      .then((loaded) => {
        if (cancelled) return;
        setPack(loaded);
        setConfig(resolvePlanConfig(loaded));
        const plan = readPhysicalPlan();
        setPhysicalPlan(plan);
        setActiveTemplateId(plan.templates[0]?.id ?? '');
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="plan-builder__error">{error}</p>;
  if (!pack || !config || !physicalPlan) {
    return <p className="plan-builder__loading">Loading plan builder…</p>;
  }

  const activeTemplate =
    physicalPlan.templates.find((t) => t.id === activeTemplateId) ?? physicalPlan.templates[0];

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

  const patchPhysicalPlan = (next: PhysicalPlanCatalog) => {
    setPhysicalPlan(next);
    setSaved(false);
  };

  const patchTargets = (patch: Partial<PhysicalPlanCatalog['targets']>) => {
    patchPhysicalPlan({
      ...physicalPlan,
      targets: { ...physicalPlan.targets, ...patch },
    });
  };

  const patchTemplate = (template: CatalogTemplate) => {
    patchPhysicalPlan({
      ...physicalPlan,
      templates: physicalPlan.templates.map((t) => (t.id === template.id ? template : t)),
    });
  };

  const save = () => {
    writePlanConfig({
      ...config,
      physical: {
        ...config.physical,
        workoutsPerWeek: Object.values(physicalPlan.weekSchedule).filter(Boolean).length || 3,
        rotation: physicalPlan.templates.map((t) => t.name),
        foundations: {
          ...config.physical.foundations,
          proteinG: physicalPlan.targets.proteinG,
          waterOz: physicalPlan.targets.waterOz,
          recovery: physicalPlan.targets.recoveryLabel,
          movement: `${physicalPlan.targets.steps.toLocaleString()} steps`,
        },
      },
    });
    writePhysicalPlan(physicalPlan);
    setSaved(true);
  };

  const reset = () => {
    clearPlanConfig();
    const defaults = buildDefaultPlanConfig(pack);
    setConfig(defaults);
    const plan = resetPhysicalPlan();
    setPhysicalPlan(plan);
    setActiveTemplateId(plan.templates[0]?.id ?? '');
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
        <h2 className="plan-builder__h2">Physical plan — daily targets</h2>
        <div className="plan-builder__grid">
          <label className="path-field plan-builder__span-2">
            <span>Primary physical goal</span>
            <input
              value={config.physical.primaryGoal}
              onChange={(e) => updatePhysical({ primaryGoal: e.target.value })}
            />
          </label>
          <label className="path-field">
            <span>Steps target</span>
            <input
              type="number"
              min={0}
              value={physicalPlan.targets.steps}
              onChange={(e) => patchTargets({ steps: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="path-field">
            <span>Steps source</span>
            <select
              value={physicalPlan.targets.stepsSource}
              onChange={(e) =>
                patchTargets({ stepsSource: e.target.value as 'manual' | 'synced' })
              }
            >
              <option value="manual">Manual</option>
              <option value="synced">Synced (when connected)</option>
            </select>
          </label>
          <label className="path-field">
            <span>Protein target (g)</span>
            <input
              type="number"
              min={0}
              value={physicalPlan.targets.proteinG}
              onChange={(e) => patchTargets({ proteinG: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="path-field">
            <span>Water target (oz)</span>
            <input
              type="number"
              min={0}
              value={physicalPlan.targets.waterOz}
              onChange={(e) => patchTargets({ waterOz: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="path-field">
            <span>Preferred water unit</span>
            <select
              value={physicalPlan.targets.waterUnit}
              onChange={(e) =>
                patchTargets({ waterUnit: e.target.value as 'oz' | 'ml' | 'L' })
              }
            >
              <option value="oz">oz</option>
              <option value="ml">ml</option>
              <option value="L">L</option>
            </select>
          </label>
          <label className="path-field plan-builder__span-2">
            <span>Recovery label</span>
            <input
              value={physicalPlan.targets.recoveryLabel}
              onChange={(e) => patchTargets({ recoveryLabel: e.target.value })}
            />
          </label>
          <label className="path-field plan-builder__check">
            <input
              type="checkbox"
              checked={physicalPlan.targets.recoveryEnabled}
              onChange={(e) => patchTargets({ recoveryEnabled: e.target.checked })}
            />
            <span>Show recovery tracking on Today</span>
          </label>
        </div>
      </section>

      <section className="plan-builder__section path-surface">
        <h2 className="plan-builder__h2">Physical plan — weekly schedule</h2>
        <div className="plan-builder__schedule">
          {WEEKDAYS.map((day) => (
            <label key={day.key} className="path-field">
              <span>{day.label}</span>
              <select
                value={physicalPlan.weekSchedule[day.key] ?? ''}
                onChange={(e) =>
                  patchPhysicalPlan({
                    ...physicalPlan,
                    weekSchedule: {
                      ...physicalPlan.weekSchedule,
                      [day.key]: e.target.value || null,
                    },
                  })
                }
              >
                <option value="">Rest / none</option>
                {physicalPlan.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="plan-builder__section path-surface">
        <h2 className="plan-builder__h2">Physical plan — workout templates</h2>
        <div className="plan-builder__template-bar">
          <label className="path-field">
            <span>Active template</span>
            <select
              value={activeTemplate?.id ?? ''}
              onChange={(e) => setActiveTemplateId(e.target.value)}
            >
              {physicalPlan.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              const id = newId('tmpl');
              const template: CatalogTemplate = {
                id,
                name: 'New workout',
                exercises: [],
              };
              patchPhysicalPlan({
                ...physicalPlan,
                templates: [...physicalPlan.templates, template],
              });
              setActiveTemplateId(id);
            }}
          >
            Add template
          </Button>
          {activeTemplate ? (
            <Button
              variant="ghost"
              onClick={() => {
                const copy: CatalogTemplate = {
                  ...structuredClone(activeTemplate),
                  id: newId('tmpl'),
                  name: `${activeTemplate.name} (copy)`,
                };
                patchPhysicalPlan({
                  ...physicalPlan,
                  templates: [...physicalPlan.templates, copy],
                });
                setActiveTemplateId(copy.id);
              }}
            >
              Duplicate
            </Button>
          ) : null}
        </div>

        {activeTemplate ? (
          <div className="plan-builder__template-edit">
            <label className="path-field">
              <span>Template name</span>
              <input
                value={activeTemplate.name}
                onChange={(e) =>
                  patchTemplate({ ...activeTemplate, name: e.target.value })
                }
              />
            </label>

            <ul className="plan-builder__ex-list">
              {activeTemplate.exercises
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item, index) => {
                  const lib = physicalPlan.exercises.find((e) => e.id === item.exerciseId);
                  return (
                    <li key={`${item.exerciseId}-${index}`} className="plan-builder__ex-row">
                      <p className="plan-builder__ex-name">
                        {lib?.name ?? item.exerciseId}
                        {item.cautionNote || lib?.cautionNote ? (
                          <span className="plan-builder__caution"> · caution</span>
                        ) : null}
                        {lib?.needsWorkingWeight ? (
                          <span className="plan-builder__caution"> · needs weight</span>
                        ) : null}
                      </p>
                      <div className="plan-builder__ex-fields">
                        <label>
                          Load
                          <input
                            value={item.loadUnit === 'bw' ? 'BW' : String(item.load ?? '')}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const isBw = raw.toUpperCase() === 'BW' || raw === '';
                              const loadUnit: ResistanceUnit = isBw ? 'bw' : 'lb';
                              const next = activeTemplate.exercises.map((ex) =>
                                ex.exerciseId === item.exerciseId && ex.order === item.order
                                  ? {
                                      ...ex,
                                      load: isBw ? null : Number(raw) || 0,
                                      loadUnit,
                                    }
                                  : ex,
                              );
                              patchTemplate({ ...activeTemplate, exercises: next });
                            }}
                          />
                        </label>
                        <label>
                          Sets
                          <input
                            type="number"
                            min={0}
                            value={item.sets}
                            onChange={(e) => {
                              const next = activeTemplate.exercises.map((ex) =>
                                ex.exerciseId === item.exerciseId && ex.order === item.order
                                  ? { ...ex, sets: Number(e.target.value) || 0 }
                                  : ex,
                              );
                              patchTemplate({ ...activeTemplate, exercises: next });
                            }}
                          />
                        </label>
                        <label>
                          Reps
                          <input
                            value={item.reps}
                            onChange={(e) => {
                              const next = activeTemplate.exercises.map((ex) =>
                                ex.exerciseId === item.exerciseId && ex.order === item.order
                                  ? { ...ex, reps: e.target.value }
                                  : ex,
                              );
                              patchTemplate({ ...activeTemplate, exercises: next });
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="plan-builder__link-btn"
                          onClick={() => {
                            const next = activeTemplate.exercises
                              .filter(
                                (ex) =>
                                  !(ex.exerciseId === item.exerciseId && ex.order === item.order),
                              )
                              .map((ex, order) => ({ ...ex, order }));
                            patchTemplate({ ...activeTemplate, exercises: next });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>

            <label className="path-field">
              <span>Add exercise from library</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const exerciseId = e.target.value;
                  if (!exerciseId || !activeTemplate) return;
                  const lib = physicalPlan.exercises.find((x) => x.id === exerciseId);
                  if (!lib) return;
                  patchTemplate({
                    ...activeTemplate,
                    exercises: [
                      ...activeTemplate.exercises,
                      {
                        exerciseId: lib.id,
                        sets: lib.defaultSets,
                        reps: lib.defaultReps,
                        load: lib.defaultLoad,
                        loadUnit: lib.defaultLoadUnit,
                        note: lib.notes,
                        cautionNote: lib.cautionNote,
                        order: activeTemplate.exercises.length,
                      },
                    ],
                  });
                  e.target.value = '';
                }}
              >
                <option value="">Select exercise…</option>
                {physicalPlan.exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                    {ex.needsWorkingWeight ? ' (needs weight)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="plan-builder__section path-surface">
        <h2 className="plan-builder__h2">Physical plan — exercise library</h2>
        <ul className="plan-builder__library">
          {physicalPlan.exercises.map((ex) => (
            <li key={ex.id} className="plan-builder__library-item">
              <div>
                <p className="plan-builder__ex-name">{ex.name}</p>
                <p className="plan-builder__library-meta">
                  {ex.equipment}
                  {ex.defaultLoadUnit === 'bw'
                    ? ' · BW'
                    : ex.defaultLoad != null
                      ? ` · ${ex.defaultLoad} lb`
                      : ' · needs weight'}
                  {ex.cautionNote ? ' · caution' : ''}
                </p>
              </div>
              <label className="path-field plan-builder__library-load">
                <span>Default load</span>
                <input
                  value={ex.defaultLoadUnit === 'bw' ? 'BW' : String(ex.defaultLoad ?? '')}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const isBw = raw.toUpperCase() === 'BW' || raw === '';
                    patchPhysicalPlan({
                      ...physicalPlan,
                      exercises: physicalPlan.exercises.map((item) =>
                        item.id === ex.id
                          ? {
                              ...item,
                              defaultLoad: isBw ? null : Number(raw) || 0,
                              defaultLoadUnit: isBw ? 'bw' : 'lb',
                              needsWorkingWeight: isBw ? false : !Number(raw),
                            }
                          : item,
                      ),
                    });
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          onClick={() => {
            const id = newId('exlib');
            patchPhysicalPlan({
              ...physicalPlan,
              exercises: [
                ...physicalPlan.exercises,
                {
                  id,
                  name: 'New exercise',
                  equipment: 'Bodyweight',
                  muscleGroups: [],
                  defaultLoad: null,
                  defaultLoadUnit: 'bw',
                  defaultSets: 3,
                  defaultReps: '10',
                  cautionNote: '',
                  needsWorkingWeight: true,
                  notes: 'Set an initial working weight before relying on history.',
                },
              ],
            });
          }}
        >
          Add exercise
        </Button>
      </section>

      <p className="path-body plan-builder__note">
        Physical templates, schedule, and library are stored in your local workout plan and drive
        Today’s Physical Training panel. Biblical day-level Scripture and teaching still come from
        the season pack. Tracks stay independent.
      </p>
    </div>
  );
}
