function CornerSquare({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="-0.5 -0.5 9 9"
      className={`absolute top-0 ${side === 'left' ? '-left-[4.5px]' : '-right-[4.5px]'}`}
    >
      <rect width="8" height="8" rx="2" fill="black" />
      <rect x="1" y="1" width="6" height="6" rx="1" fill="var(--color-sapien-surface)" />
    </svg>
  );
}

export function SectionDivider() {
  return (
    // The odd-sized SVG viewport centers the 8px square on the painted 1px line.
    <div
      aria-hidden="true"
      style={{ insetInline: 'calc(-1 * var(--section-rail-border, 0px))' }}
      className="pointer-events-none absolute -bottom-1 z-40 h-2"
    >
      <span className="absolute top-1 left-1/2 h-px w-screen -translate-x-1/2 bg-sapien-border" />
      <CornerSquare side="left" />
      <CornerSquare side="right" />
    </div>
  );
}
