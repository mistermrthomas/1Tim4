import { Link } from 'react-router-dom';
import type { DailyEntry } from '../../types';
import './TrailStages.css';

interface TrailStagesProps {
  entry: DailyEntry;
  compact?: boolean;
}

function buildPrepareSnippet(entry: DailyEntry): string | null {
  const p = entry.prepare;
  if (!p) return null;
  const parts: string[] = [];
  if (p.standoutVerses[0]) {
    parts.push(`${p.standoutVerses[0].reference} stood out`);
  }
  if (p.notes) parts.push(p.notes);
  else if (p.responses[0]?.answer) parts.push(p.responses[0].answer);
  return parts.join(' — ') || 'Morning preparation recorded.';
}

export function TrailStages({ entry, compact }: TrailStagesProps) {
  const hasPrepare = !!entry.prepare;
  const hasLive = !!entry.live;
  const hasReflect = !!entry.reflect;

  const currentStage = !hasPrepare ? 'prepare' : !hasLive ? 'live' : !hasReflect ? 'reflect' : 'complete';

  return (
    <div className={`trail-stages${compact ? ' trail-stages--compact' : ''}`}>
      <div className="section-head">
        <h2 className="section-title">Today&apos;s trail</h2>
      </div>

      <div className="trail-stages__path">
        <Stage
          time="Morning"
          name="Prepare"
          desc="Set your heart before the day begins."
          compact={compact}
          state={hasPrepare ? 'past' : currentStage === 'prepare' ? 'current' : 'future'}
          to="/prepare"
          snippet={hasPrepare ? buildPrepareSnippet(entry) ?? undefined : undefined}
          invite={currentStage === 'prepare' ? 'Begin your morning preparation' : undefined}
          quiet={!hasPrepare && currentStage !== 'prepare' ? 'Not yet started' : undefined}
        />
        <Stage
          time="Midday"
          name="Live"
          desc="Pause amid the day. Notice where God is at work."
          compact={compact}
          state={hasLive ? 'past' : currentStage === 'live' ? 'current' : 'future'}
          to="/live"
          snippet={entry.live?.responses[0]?.answer}
          invite={currentStage === 'live' ? 'How are you doing? Pause and check in.' : undefined}
          quiet={currentStage === 'reflect' || currentStage === 'complete' ? undefined : !hasLive && currentStage !== 'live' ? 'Opens when you are ready' : undefined}
        />
        <Stage
          time="Evening"
          name="Reflect"
          desc="Review the day. Capture what matters."
          compact={compact}
          state={hasReflect ? 'past' : currentStage === 'reflect' ? 'current' : 'future'}
          to="/reflect"
          snippet={entry.reflect?.responses[0]?.answer}
          invite={currentStage === 'reflect' ? 'Where did you see God at work today?' : undefined}
          quiet={currentStage !== 'reflect' && !hasReflect ? 'Opens this evening' : undefined}
        />
      </div>
    </div>
  );
}

function Stage({
  time,
  name,
  desc,
  compact,
  state,
  to,
  snippet,
  invite,
  quiet,
}: {
  time: string;
  name: string;
  desc: string;
  compact?: boolean;
  state: 'past' | 'current' | 'future';
  to: string;
  snippet?: string;
  invite?: string;
  quiet?: string;
}) {
  return (
    <Link to={to} className={`trail-stage trail-stage--${state}`}>
      <div className="trail-stage__marker">
        <span className="trail-stage__dot" aria-hidden="true" />
        <span className="trail-stage__time">{time}</span>
      </div>
      <div className="trail-stage__card">
        <div className="trail-stage__name serif">{name}</div>
        {!compact && <div className="trail-stage__desc">{desc}</div>}
        {snippet && <p className="trail-stage__snippet">{snippet}</p>}
        {invite && <p className="trail-stage__invite">{invite}</p>}
        {quiet && !snippet && !invite && <p className="trail-stage__quiet">{quiet}</p>}
        {state === 'past' && <span className="trail-stage__entered">Entered · tap to view</span>}
      </div>
    </Link>
  );
}
