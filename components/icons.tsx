// Hand-drawn 16px stroke icons — no icon library. Kept deliberately few.

type IconProps = { size?: number };

const base = (size: number) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }) as const;

export function IconHome({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 7.5 8 2.5l5.5 5v6h-4v-3.5h-3V13.5h-4z" />
    </svg>
  );
}

export function IconPen({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 13l.8-3L10.5 3.3a1.2 1.2 0 0 1 1.7 0l.5.5a1.2 1.2 0 0 1 0 1.7L6 12.2 3 13z" />
    </svg>
  );
}

export function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 8.5 6 12l7.5-8" />
    </svg>
  );
}

export function IconChart({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 13.5v-4M6.2 13.5V6M9.9 13.5V8.5M13.5 13.5v-9" />
    </svg>
  );
}

export function IconTrophy({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 2.5h6v4a3 3 0 0 1-6 0v-4zM5 3.5H3v1a2 2 0 0 0 2 2M11 3.5h2v1a2 2 0 0 1-2 2M8 9.5v2M5.5 13.5h5" />
    </svg>
  );
}

export function IconSeal({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.8 8.2 7.4 9.8l3-3.4" />
    </svg>
  );
}

export function IconGear({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M12.2 3.8l-1.4 1.4M5.2 10.8l-1.4 1.4" />
    </svg>
  );
}
