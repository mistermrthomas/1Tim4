/** Geometric mark — one-color friendly, apparel-ready. */
export function PathMark({
  className,
  title = 'Path',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Hex shield */}
      <path
        d="M32 4 L56 18 V38 L32 60 L8 38 V18 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Inner path / ascent */}
      <path
        d="M22 40 L32 18 L42 40"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="44" r="2.75" fill="currentColor" />
    </svg>
  );
}
