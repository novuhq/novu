import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * The human.md logo of the standalone screens (`App/Logo` in Figma): the 22px mark, drawn from its exported
 * paths, and the wordmark.
 */
export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="human.md" className={cn('flex shrink-0 items-center gap-2.5 rounded-sm', className)}>
      <svg aria-hidden="true" viewBox="0 0 22 22" className="size-5.5" fill="none">
        <path
          className="fill-accent"
          d="M21.083 0c.506 0 .917.41.917.917v13.291c0 .506-.41.917-.917.917h-9.88c-.118 0-.203-.112-.203-.23v-2.978A.917.917 0 0 0 10.083 11H7.104c-.117 0-.229-.085-.229-.202V.917c0-.506.41-.917.917-.917h13.291Z"
        />
        <path
          fill="#5C5650"
          d="M6.188 14.896c0 .506.41.917.916.917h1.604c.506 0 .917.41.917.916v4.354c0 .506-.41.917-.917.917H.917A.917.917 0 0 1 0 21.083v-7.791c0-.506.41-.917.917-.917h4.354c.506 0 .916.41.916.917v1.604Z"
        />
      </svg>
      <span className="font-mono text-[15px] leading-5 tracking-[-0.3px] text-foreground">human.md</span>
    </Link>
  );
}

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
