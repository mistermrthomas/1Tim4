import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { latestBodyEntry, recentBodyEntries, upsertBodyEntry } from '../../domain/physicalLife/body';
import {
  completeMobility,
  MOBILITY_MOVES,
  mobilityCompletionsInLastDays,
} from '../../domain/physicalLife/mobility';
import {
  isTravelDay,
  setTravelDayKind,
  travelRecommendation,
  type TravelDayKind,
} from '../../domain/physicalLife/travel';
import {
  recentWalks,
  stepsForDate,
  upsertWalkingEntry,
} from '../../domain/physicalLife/walking';
import { todayDateKey } from '../../domain/physical/store';
import {
  bootstrapRotationFromLogs,
  completeNextSlot,
  daysSince,
  formatDaysSince,
  getLastSlot,
  getNextSlot,
  readRotationState,
} from '../../domain/strength/rotation';
import { activeWorkouts, readStrengthState } from '../../domain/strength/store';
import { Button } from '../../ui/Button';

type PhysicalSection = 'overview' | 'strength' | 'mobility' | 'walking' | 'body' | 'travel';

function sectionFromParams(params: URLSearchParams): PhysicalSection {
  const raw = params.get('section') ?? 'overview';
  if (
    raw === 'strength' ||
    raw === 'mobility' ||
    raw === 'walking' ||
    raw === 'body' ||
    raw === 'travel'
  ) {
    return raw;
  }
  return 'overview';
}

export function PhysicalTrainingSections() {
  const [params, setParams] = useSearchParams();
  const section = sectionFromParams(params);
  const setSection = (next: PhysicalSection) => {
    const copy = new URLSearchParams(params);
    copy.set('area', 'physical');
    if (next === 'overview') copy.delete('section');
    else copy.set('section', next);
    setParams(copy, { replace: true });
  };

  return (
    <div className="training-panel path-surface">
      <h2 className="training-panel__title path-display">Physical training</h2>
      <p className="training-panel__lede">
        Strength, mobility, walking, and body composition — built for long-term capability, not
        weight-loss pressure.
      </p>
      <nav className="training-subnav" aria-label="Physical sections">
        {(
          [
            ['overview', 'Overview'],
            ['strength', 'Strength'],
            ['mobility', 'Mobility'],
            ['walking', 'Walking'],
            ['body', 'Body'],
            ['travel', 'Travel'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`path-btn ${section === id ? 'path-btn--primary' : 'path-btn--ghost'}`}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {section === 'overview' ? <PhysicalOverview onOpen={setSection} /> : null}
      {section === 'strength' ? <StrengthSection /> : null}
      {section === 'mobility' ? <MobilitySection /> : null}
      {section === 'walking' ? <WalkingSection /> : null}
      {section === 'body' ? <BodySection /> : null}
      {section === 'travel' ? <TravelSection /> : null}
    </div>
  );
}

function PhysicalOverview({ onOpen }: { onOpen: (section: PhysicalSection) => void }) {
  const strength = readStrengthState();
  bootstrapRotationFromLogs(strength);
  const rotation = readRotationState();
  const next = getNextSlot(rotation);
  const last = getLastSlot(rotation);
  const travel = travelRecommendation();
  const mobilityWeek = mobilityCompletionsInLastDays(7);

  return (
    <>
      <dl className="training-grid training-grid--2">
        <div className="training-stat">
          <dt>Next in rotation</dt>
          <dd>{travel.trip ? travel.label : next.shortLabel}</dd>
        </div>
        <div className="training-stat">
          <dt>Last completed</dt>
          <dd>
            {last
              ? `${last.shortLabel} · ${formatDaysSince(daysSince(rotation.lastCompletedDate))}`
              : 'Not started'}
          </dd>
        </div>
        <div className="training-stat">
          <dt>Mobility (7 days)</dt>
          <dd>Completed {mobilityWeek} time{mobilityWeek === 1 ? '' : 's'}</dd>
        </div>
        <div className="training-stat">
          <dt>Today’s steps</dt>
          <dd>{stepsForDate().toLocaleString()}</dd>
        </div>
      </dl>
      {travel.trip ? (
        <p className="training-meta">
          Travel mode · {travel.trip.name}: {travel.guidance}
        </p>
      ) : null}
      <div className="training-actions">
        <Button onClick={() => onOpen('strength')}>Open strength</Button>
        <Button variant="ghost" onClick={() => onOpen('mobility')}>
          Mobility
        </Button>
        <Button variant="ghost" onClick={() => onOpen('walking')}>
          Walking
        </Button>
        <Button variant="ghost" onClick={() => onOpen('body')}>
          Body
        </Button>
      </div>
    </>
  );
}

function StrengthSection() {
  const strength = readStrengthState();
  const [rotation, setRotation] = useState(() => bootstrapRotationFromLogs(strength));
  const next = getNextSlot(rotation);
  const last = getLastSlot(rotation);
  const workouts = activeWorkouts(strength);
  const travel = isTravelDay();

  return (
    <>
      <dl className="training-grid training-grid--2">
        <div className="training-stat">
          <dt>Last completed</dt>
          <dd>{last?.label ?? 'None yet'}</dd>
        </div>
        <div className="training-stat">
          <dt>Date last performed</dt>
          <dd>
            {rotation.lastCompletedDate
              ? `${rotation.lastCompletedDate} · ${formatDaysSince(daysSince(rotation.lastCompletedDate))}`
              : '—'}
          </dd>
        </div>
        <div className="training-stat">
          <dt>Next recommended</dt>
          <dd>{next.label}</dd>
        </div>
        <div className="training-stat">
          <dt>Travel</dt>
          <dd>{travel ? 'Maintenance mode' : 'Normal rotation'}</dd>
        </div>
      </dl>
      <p className="training-meta">
        Rotation: A → B → Recovery/Walk → C → A → B → Recovery/Walk. Missed days do not skip
        permanently — continue with the next slot.
      </p>
      <div className="training-links">
        {workouts.map((workout) => (
          <Link
            key={workout.id}
            className="path-btn path-btn--primary"
            to={`/workouts?w=${workout.id}`}
          >
            {workout.shortLabel}
          </Link>
        ))}
        <Link className="path-btn path-btn--ghost" to="/workouts">
          All exercises table
        </Link>
      </div>
      {next.kind === 'recovery' ? (
        <div className="training-actions">
          <Button
            onClick={() => setRotation(completeNextSlot('Recovery / walk day'))}
          >
            Mark recovery / walk done
          </Button>
          <Link className="path-btn path-btn--ghost" to="/training?area=physical&section=walking">
            Log a walk
          </Link>
        </div>
      ) : next.workoutId ? (
        <div className="training-actions">
          <Link className="path-btn path-btn--primary" to={`/workouts?w=${next.workoutId}`}>
            Begin {next.shortLabel}
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  `Mark ${next.shortLabel} complete in the rotation? (Use after you finish logging lifts.)`,
                )
              ) {
                setRotation(completeNextSlot());
              }
            }}
          >
            Mark rotation complete
          </Button>
        </div>
      ) : null}
    </>
  );
}

function MobilitySection() {
  const [note, setNote] = useState('');
  const [painNote, setPainNote] = useState('');
  const [tick, setTick] = useState(0);
  const weekCount = useMemo(() => {
    void tick;
    return mobilityCompletionsInLastDays(7);
  }, [tick]);

  return (
    <>
      <p className="training-meta">About 5–8 minutes. Checklist only — no per-stretch timers.</p>
      <ul className="training-checklist">
        {MOBILITY_MOVES.map((move) => (
          <li key={move.id}>
            <span>{move.name}</span>
            <span className="training-checklist__detail">{move.detail}</span>
          </li>
        ))}
      </ul>
      <p className="training-meta">Completed {weekCount} time{weekCount === 1 ? '' : 's'} in the last 7 days.</p>
      <div className="training-form">
        <label className="path-field">
          <span>Optional note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="path-field">
          <span>Optional pain / stiffness</span>
          <input value={painNote} onChange={(e) => setPainNote(e.target.value)} />
        </label>
        <Button
          onClick={() => {
            completeMobility({ note, painNote });
            setNote('');
            setPainNote('');
            setTick((n) => n + 1);
          }}
        >
          Complete mobility
        </Button>
      </div>
    </>
  );
}

function WalkingSection() {
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [note, setNote] = useState('');
  const [walks, setWalks] = useState(() => recentWalks());
  const steps = stepsForDate();

  return (
    <>
      <p className="training-meta">
        Walking supports heart health, recovery, and travel endurance. No 10,000-step pressure.
        Today’s steps (if synced/manual): {steps.toLocaleString()}.
      </p>
      <div className="training-form">
        <label className="path-field">
          <span>Duration (minutes)</span>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        <label className="path-field">
          <span>Distance (miles, optional)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </label>
        <label className="path-field">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="training-actions">
          <Button
            onClick={() => {
              upsertWalkingEntry({
                durationMin: duration ? Number(duration) : null,
                distance: distance ? Number(distance) : null,
                note,
                planned: false,
              });
              setDuration('');
              setDistance('');
              setNote('');
              setWalks(recentWalks());
            }}
          >
            Record walk
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              upsertWalkingEntry({ planned: true, note: note || 'Planned walk' });
              setNote('');
              setWalks(recentWalks());
            }}
          >
            Mark planned walk
          </Button>
        </div>
      </div>
      <div className="strength-table-wrap">
        <table className="training-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>Distance</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {walks.length === 0 ? (
              <tr>
                <td colSpan={4}>No walks logged yet.</td>
              </tr>
            ) : (
              walks.map((walk) => (
                <tr key={walk.id}>
                  <td>{walk.date}</td>
                  <td>{walk.durationMin != null ? `${walk.durationMin} min` : walk.planned ? 'Planned' : '—'}</td>
                  <td>
                    {walk.distance != null ? `${walk.distance} ${walk.distanceUnit}` : '—'}
                  </td>
                  <td>{walk.note || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BodySection() {
  const latest = latestBodyEntry();
  const [weight, setWeight] = useState(latest?.weightLb != null ? String(latest.weightLb) : '');
  const [bodyFat, setBodyFat] = useState(
    latest?.bodyFatPct != null ? String(latest.bodyFatPct) : '',
  );
  const [lean, setLean] = useState(latest?.leanMassLb != null ? String(latest.leanMassLb) : '');
  const [muscle, setMuscle] = useState(
    latest?.skeletalMuscleLb != null ? String(latest.skeletalMuscleLb) : '',
  );
  const [visceral, setVisceral] = useState(
    latest?.visceralFatIndex != null ? String(latest.visceralFatIndex) : '',
  );
  const [waist, setWaist] = useState(latest?.waistIn != null ? String(latest.waistIn) : '');
  const [rows, setRows] = useState(() => recentBodyEntries());

  return (
    <>
      <p className="training-meta">
        Track composition and trends. Maintain weight while improving strength, mobility, and
        function. BMI is hidden by default.
      </p>
      <div className="training-form">
        <div className="training-grid training-grid--2">
          <label className="path-field">
            <span>Weight (lb)</span>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className="path-field">
            <span>Body fat %</span>
            <input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
          </label>
          <label className="path-field">
            <span>Lean mass (lb)</span>
            <input type="number" value={lean} onChange={(e) => setLean(e.target.value)} />
          </label>
          <label className="path-field">
            <span>Skeletal muscle (lb)</span>
            <input type="number" value={muscle} onChange={(e) => setMuscle(e.target.value)} />
          </label>
          <label className="path-field">
            <span>Visceral fat index</span>
            <input type="number" value={visceral} onChange={(e) => setVisceral(e.target.value)} />
          </label>
          <label className="path-field">
            <span>Waist (in)</span>
            <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} />
          </label>
        </div>
        <Button
          onClick={() => {
            upsertBodyEntry({
              date: todayDateKey(),
              weightLb: weight ? Number(weight) : null,
              bodyFatPct: bodyFat ? Number(bodyFat) : null,
              leanMassLb: lean ? Number(lean) : null,
              skeletalMuscleLb: muscle ? Number(muscle) : null,
              visceralFatIndex: visceral ? Number(visceral) : null,
              waistIn: waist ? Number(waist) : null,
            });
            setRows(recentBodyEntries());
          }}
        >
          Save body metrics
        </Button>
      </div>
      <div className="strength-table-wrap">
        <table className="training-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight</th>
              <th>BF%</th>
              <th>Lean</th>
              <th>Muscle</th>
              <th>Visceral</th>
              <th>Waist</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>No body metrics yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.weightLb ?? '—'}</td>
                  <td>{row.bodyFatPct ?? '—'}</td>
                  <td>{row.leanMassLb ?? '—'}</td>
                  <td>{row.skeletalMuscleLb ?? '—'}</td>
                  <td>{row.visceralFatIndex ?? '—'}</td>
                  <td>{row.waistIn ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TravelSection() {
  const today = todayDateKey();
  const rec = travelRecommendation(today);
  const [kind, setKind] = useState<TravelDayKind>(rec.kind ?? 'hotel_strength');

  return (
    <>
      {rec.trip ? (
        <>
          <dl className="training-grid training-grid--2">
            <div className="training-stat">
              <dt>Trip</dt>
              <dd>{rec.trip.name}</dd>
            </div>
            <div className="training-stat">
              <dt>Dates</dt>
              <dd>
                {rec.trip.startDate} → {rec.trip.endDate}
              </dd>
            </div>
            <div className="training-stat">
              <dt>Today</dt>
              <dd>{rec.label}</dd>
            </div>
          </dl>
          <p className="training-meta">{rec.trip.notes}</p>
          <p className="training-meta">{rec.guidance}</p>
          <label className="path-field">
            <span>Today’s travel option</span>
            <select
              value={kind}
              onChange={(e) => {
                const next = e.target.value as TravelDayKind;
                setKind(next);
                setTravelDayKind(rec.trip!.id, today, next);
              }}
            >
              <option value="travel">All-day travel</option>
              <option value="hotel_strength">Hotel strength workout</option>
              <option value="walk">20–40 minute walk</option>
              <option value="mobility">Mobility only</option>
              <option value="rest">Rest</option>
            </select>
          </label>
        </>
      ) : (
        <p className="training-meta">
          No active travel window today. The Poland trip (Aug 16–21, 2026) will appear here when
          those dates arrive. Rotation is preserved through travel.
        </p>
      )}
    </>
  );
}
