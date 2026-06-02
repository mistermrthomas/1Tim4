/** Subtle trail / map motifs for cards and headers */
export function MapCorner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`map-corner ${className}`.trim()}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <path d="M24 4v40M4 24h40" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      <path d="M8 8 L40 40 M40 8 L8 40" stroke="currentColor" strokeWidth="0.4" opacity="0.1" />
      <polygon points="24,10 26,22 24,34 22,22" fill="currentColor" opacity="0.35" />
      <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function TrailDivider() {
  return (
    <div className="trail-divider" aria-hidden="true">
      <span className="trail-divider__line" />
      <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" opacity="0.4">
        <circle cx="6" cy="6" r="2" />
      </svg>
      <span className="trail-divider__line" />
    </div>
  );
}
