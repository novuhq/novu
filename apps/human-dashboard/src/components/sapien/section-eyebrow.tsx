import { cn } from '@/lib/utils';

/** A section's plate: an accent square, its index, then its name. */
export function SectionEyebrow({
  index,
  children,
  className,
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-2.5 font-sapien-mono text-[11px] leading-none tracking-[0.08em] text-sapien-foreground/50 uppercase',
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 bg-accent" />
      {index ? (
        <span aria-hidden="true" className="text-sapien-foreground/30">
          {index}
        </span>
      ) : null}
      {children}
    </p>
  );
}

/** The accent words of a heading, in Redaction italic. */
export function DisplayAccent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <em className={cn('font-sapien-display font-normal tracking-[-0.02em] text-accent italic', className)}>
      {children}
    </em>
  );
}
