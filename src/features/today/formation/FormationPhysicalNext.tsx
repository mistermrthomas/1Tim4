import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { travelRecommendation } from '../../../domain/physicalLife/travel';
import { todayDateKey } from '../../../domain/physical/store';
import {
  bootstrapRotationFromLogs,
  completeNextSlot,
  getNextSlot,
  readRotationState,
  type RotationSlot,
} from '../../../domain/strength/rotation';
import { readStrengthState } from '../../../domain/strength/store';

function slotObjective(slot: RotationSlot): string {
  if (slot.kind === 'recovery') {
    return 'Recover well so tomorrow’s training stays strong.';
  }
  return 'Train with focus. Quality reps over rushing.';
}

export function FormationPhysicalNext() {
  const dateKey = todayDateKey();
  const [slot, setSlot] = useState<RotationSlot>(() => getNextSlot(readRotationState()));
  const travel = travelRecommendation(dateKey);

  useEffect(() => {
    bootstrapRotationFromLogs(readStrengthState());
    setSlot(getNextSlot(readRotationState()));
  }, [dateKey]);

  const title = travel.label || slot.shortLabel || slot.label;
  const minutes = travel.kind === 'walk' ? 20 : slot.kind === 'recovery' ? 15 : 45;
  const href =
    travel.kind === 'walk'
      ? '/training'
      : travel.kind === 'mobility'
        ? '/training'
        : slot.kind === 'recovery'
          ? '/training'
          : '/training/physical/strength';

  return (
    <section className="formation-block formation-physical" aria-label="Physical training">
      <div className="formation-block__head">
        <p className="formation-block__eyebrow">Body</p>
        <h2 className="formation-block__title">Physical training</h2>
        <p className="formation-block__lead">Train the body after the Word has set the day’s aim.</p>
      </div>
      <div className="formation-physical__card">
        <p className="formation-physical__name">{title}</p>
        <p className="formation-physical__meta">About {minutes} min</p>
        <p className="formation-physical__objective">{travel.guidance || slotObjective(slot)}</p>
        <div className="formation-physical__actions">
          <Link className="path-btn path-btn--primary" to={href}>
            Start
          </Link>
          {slot.kind === 'workout' || slot.kind === 'recovery' ? (
            <button
              type="button"
              className="path-btn path-btn--ghost"
              onClick={() => {
                completeNextSlot(dateKey);
                setSlot(getNextSlot(readRotationState()));
              }}
            >
              Mark done
            </button>
          ) : null}
          <Link className="formation-link-btn" to="/training">
            Targets & details
          </Link>
        </div>
      </div>
    </section>
  );
}
