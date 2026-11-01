import { Terminal } from 'lucide-react';

import type { Host } from '@/lib/hosts';
import { cn } from '@/lib/utils';

type HostLogoProps = {
  host: Host;
  /** 16px in a public page's chip, 22px on a picker tile, 24px in a row or a pill, 40px next to a title. */
  size: 'small' | 'tile' | 'medium' | 'large';
  className?: string;
};

/** Each size of the design's `Agent tile`: its corners, the faint line inside its edge, and its fallback mark. */
const SIZES: Record<HostLogoProps['size'], { tile: string; edge: string; mark: string; icon: string }> = {
  small: { tile: 'size-4 rounded-[3.5px]', edge: 'ring-1', mark: 'text-[9px] leading-none', icon: 'size-2.5' },
  tile: { tile: 'size-5.5 rounded-[5.5px]', edge: 'ring-[0.688px]', mark: 'text-[10px] leading-none', icon: 'size-3' },
  medium: { tile: 'size-6 rounded-md', edge: 'ring-[0.75px]', mark: 'text-[11px] leading-none', icon: 'size-3.5' },
  large: { tile: 'size-10 rounded-[8.75px]', edge: 'ring-1', mark: 'text-base leading-none', icon: 'size-5' },
};

/**
 * A host's logo on its rounded tile, with the faint inner line of the design's `Brand logo`. A host whose
 * logo isn't in `public/tools` yet gets a neutral tile with its first letter instead. General, which is no
 * product, gets a terminal, and on the dashboard's picker and pill the dashed "+" tile of `Any MCP`.
 */
export function HostLogo({ host, size, className }: HostLogoProps) {
  const { tile, edge, mark, icon } = SIZES[size];

  if (host.icon) {
    return (
      <span className={cn('relative block shrink-0 overflow-hidden', tile, className)}>
        <img src={host.icon} alt="" className="size-full" />
        <span aria-hidden="true" className={cn('absolute inset-0 rounded-[inherit] ring-white/8 ring-inset', edge)} />
      </span>
    );
  }

  if (host.id === 'general' && (size === 'tile' || size === 'medium')) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center border-[0.611px] border-dashed border-border-strong font-mono font-medium text-secondary',
          tile,
          size === 'tile' ? 'text-[9.778px] leading-[12.222px]' : 'text-[10.667px] leading-[13.333px]',
          className
        )}
      >
        +
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        // In sans: Geist Mono draws an "O" much like a zero.
        'flex shrink-0 items-center justify-center bg-raised font-sans font-medium text-default ring-1 ring-border-strong ring-inset',
        tile,
        mark,
        className
      )}
    >
      {host.id === 'general' ? <Terminal className={icon} strokeWidth={2} /> : host.name.charAt(0)}
    </span>
  );
}
