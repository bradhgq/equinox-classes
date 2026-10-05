// Line icons, 24-unit grid, 1.5px stroke. Decorative: the control carrying the
// icon provides the accessible name.

const PATHS = {
  share: "M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v9h14v-9",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  "chevron-right": "m9 6 6 6-6 6",
  "chevron-down": "m6 9 6 6 6-6",
  search: "M15.5 15.5 20 20M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  external: "M7 17 17 7M9 7h8v8",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: 16 | 20 | 24;
  class?: string;
}

export function Icon({ name, size = 20, class: className }: Props) {
  return (
    <svg
      class={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={size === 16 ? 1.75 : 1.5}
      stroke-linecap="square"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
