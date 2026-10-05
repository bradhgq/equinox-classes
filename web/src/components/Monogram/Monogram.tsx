/**
 * The "EC" mark (same drawing as public/icons/icon.svg): a ring open on the
 * right reads as C around a geometric E. Uses currentColor so it inverts in
 * dark mode.
 */
export function Monogram({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false" style={{ flex: "none" }}>
      <rect width="512" height="512" fill="currentColor" />
      <g style={{ color: "var(--color-inverse)" }}>
        <path d="M385.9 181 A150 150 0 1 0 385.9 331" fill="none" stroke="currentColor" stroke-width="28" />
        <rect x="203" y="190" width="28" height="132" fill="currentColor" />
        <rect x="203" y="190" width="100" height="28" fill="currentColor" />
        <rect x="203" y="242" width="86" height="28" fill="currentColor" />
        <rect x="203" y="294" width="100" height="28" fill="currentColor" />
      </g>
    </svg>
  );
}
