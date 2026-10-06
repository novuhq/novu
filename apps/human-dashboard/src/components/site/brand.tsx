import Link from 'next/link';

import { cn } from '@/lib/utils';

/** The gethuman.md mark and wordmark as used in the dashboard and on the standalone account screens. */
export function Brand({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="gethuman.md" className={cn('flex shrink-0 items-center gap-2 rounded-sm', className)}>
      <span aria-hidden="true" className="relative size-4.5">
        <span className="absolute bottom-0 left-0 size-2.5 rounded-[2px] bg-surface" />
        <span className="absolute top-0 right-0 size-3 rounded-[2px] bg-accent" />
      </span>
      <span className="font-mono text-sm leading-none tracking-tight text-foreground">
        gethuman<span className="text-accent">.md</span>
      </span>
    </Link>
  );
}
