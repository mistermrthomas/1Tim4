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
  const onTravelDay = Boolean(travel.trip && travel.kind);

  useEffect(() => {
    bootstrapRotationFromLogs(readStrengthState());
    setSlot(getNextSlot(readRotationState()));
  }, [dateKey]);

  const title = onTravelDay
    ? travel.label
    : slot.shortLabel || slot.label || 'Strength training';
  const minutes = onTravelDay
    ? travel.kind === 'walk'
      ? 30
      : travel.kind === 'mobility' || travel.kind === 'rest' || travel.kind === 'travel'
        ? 20
        : 40
    : slot.kind === 'recovery'
      ? 15
      : 45;
  const objective = onTravelDay ? travel.guidance : slotObjective(slot);
  const href = onTravelDay
    ? travel.kind === 'hotel_strength'
      ? '/training/physical/strength'
      : '/training'
    : slot.kind === 'recovery'
      ? '/training'
      : '/training/physical/strength';

  return (
    <div className="formation-physical">
      <div className="formation-physical__card">
        <p className="formation-physical__name">{title}</p>
        <p className="formation-physical__meta">About {minutes} min</p>
        <p className="formation-physical__objective">{objective}</p>
        <div className="formation-physical__actions">
          <Link className="path-btn path-btn--primary" to={href}>
            Start
          </Link>
          {!onTravelDay && (slot.kind === 'workout' || slot.kind === 'recovery') ? (
            <button
              type="button"
              className="path-btn path-btn--ghost"
              onClick={() => {
                completeNextSlot('', dateKey);
                setSlot(getNextSlot(readRotationState()));
              }}
            >
              Mark done
            </button>
          ) : null}
          <Link className="formation-link-btn" to="/training/physical/strength">
            Strength log
          </Link>
        </div>
      </div>
    </div>
  );
}
