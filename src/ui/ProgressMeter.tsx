export function ProgressMeter({
  label,
  valueLabel,
  percent,
}: {
  label: string;
  valueLabel: string;
  percent: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="path-progress">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <p className="path-label">{label}</p>
        <p className="path-label" style={{ color: 'var(--path-gold)' }}>
          {valueLabel}
        </p>
      </div>
      <div className="path-progress__track" aria-hidden>
        <div className="path-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
