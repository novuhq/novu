import { Terminal } from 'lucide-react';

import type { Host } from '@/lib/hosts';
import { cn } from '@/lib/utils';

type HostLogoProps = {
  host: Host;
  /** 16px in a picker chip, 24px in a row, 40px next to a title. */
  size: 'small' | 'medium' | 'large';
  className?: string;
};

const SIZES: Record<HostLogoProps['size'], { tile: string; mark: string; icon: string }> = {
  small: { tile: 'size-4 rounded-[3.5px]', mark: 'text-[9px] leading-none', icon: 'size-2.5' },
  medium: { tile: 'size-6 rounded-[5.25px]', mark: 'text-[11px] leading-none', icon: 'size-3.5' },
  large: { tile: 'size-10 rounded-[8.75px]', mark: 'text-base leading-none', icon: 'size-5' },
};

/**
 * A host's logo on its rounded tile, with the faint inner line of the design's `Brand logo`. A host whose
 * logo isn't in `public/tools` yet gets a neutral tile with its first letter instead, and General, which is
 * no product, a terminal.
 */
export function HostLogo({ host, size, className }: HostLogoProps) {
  const { tile, mark, icon } = SIZES[size];

  if (host.icon) {
    return (
      <span className={cn('relative block shrink-0 overflow-hidden', tile, className)}>
        <img src={host.icon} alt="" className="size-full" />
        <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] ring-1 ring-white/8 ring-inset" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center bg-raised font-mono font-medium text-default ring-1 ring-border-strong ring-inset',
        tile,
        mark,
        className
      )}
    >
      {host.id === 'general' ? <Terminal className={icon} strokeWidth={2} /> : host.name.charAt(0)}
    </span>
  );
}
