export function SectionDivider() {
  return (
    // Above the section rails (z-30), so the pins sit on top of the vertical lines.
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-1 z-40 h-2">
      <span className="absolute top-1 left-1/2 h-px w-screen -translate-x-1/2 bg-sapien-border" />
      <span className="absolute left-0 size-2 -translate-x-1/2 rounded-[2px] border border-black bg-sapien-surface" />
      <span className="absolute right-0 size-2 translate-x-1/2 rounded-[2px] border border-black bg-sapien-surface" />
    </div>
  );
}
